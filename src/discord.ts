import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
  ChannelType,
  MessageFlags,
  ThreadAutoArchiveDuration,
  type Message,
  type OmitPartialGroupDMChannel,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
  type ThreadChannel,
  type TextChannel,
  type NewsChannel,
} from "discord.js";
import type { AppConfig } from "./config.js";
import { HistoryStore } from "./history.js";
import { ThinkingStore } from "./thinking-store.js";
import {
  ollamaChat,
  listOllamaModels,
  OllamaVisionUnsupportedError,
  type ChatMessage,
} from "./ollama.js";
import { logChat } from "./logger.js";
import { registerSlashCommands } from "./commands.js";
import {
  formatCurrentModel,
  formatSwitchedModel,
  formatThinkingStatus,
  getCopy,
} from "./i18n.js";

const DISCORD_MAX_LEN = 2000;
const THREAD_NAME_MAX = 80;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_IMAGES_PER_MESSAGE = 4;
const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)(?:\?|$)/i;

interface DiscordAttachmentLike {
  url: string;
  contentType?: string | null;
  name?: string | null;
  size?: number | null;
}

function isImageAttachment(att: DiscordAttachmentLike): boolean {
  const type = att.contentType ?? "";
  if (type.startsWith("image/")) return true;
  const name = att.name ?? "";
  if (IMAGE_EXT_RE.test(name)) return true;
  return IMAGE_EXT_RE.test(att.url);
}

async function downloadImagesAsBase64(
  attachments: DiscordAttachmentLike[]
): Promise<string[]> {
  const images: string[] = [];
  const targets = attachments.filter(isImageAttachment).slice(0, MAX_IMAGES_PER_MESSAGE);
  for (const att of targets) {
    if (typeof att.size === "number" && att.size > MAX_IMAGE_BYTES) {
      console.warn(
        `[discord] skip large image: name=${att.name ?? "?"} size=${att.size} (>20MB)`
      );
      continue;
    }
    try {
      const res = await fetch(att.url);
      if (!res.ok) {
        console.warn(
          `[discord] failed to download image: ${res.status} ${res.statusText} url=${att.url}`
        );
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_IMAGE_BYTES) {
        console.warn(
          `[discord] skip large image after download: name=${att.name ?? "?"} size=${buf.byteLength}`
        );
        continue;
      }
      images.push(buf.toString("base64"));
    } catch (err) {
      console.warn(`[discord] image download error: ${String(err)} url=${att.url}`);
    }
  }
  return images;
}

function splitForDiscord(text: string, limit = DISCORD_MAX_LEN): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > limit) {
    let cut = remaining.lastIndexOf("\n", limit);
    if (cut < limit * 0.5) {
      cut = remaining.lastIndexOf(" ", limit);
    }
    if (cut < limit * 0.5) {
      cut = limit;
    }
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\s+/, "");
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function makeThreadName(content: string, fallbackTitle: string): string {
  const firstLine = (content.split("\n")[0] ?? content).trim();
  if (!firstLine) return fallbackTitle;
  if (firstLine.length <= THREAD_NAME_MAX) return firstLine;
  return firstLine.slice(0, THREAD_NAME_MAX - 1) + "…";
}

function isAllowed(cfg: AppConfig, msg: Message): boolean {
  if (msg.author.bot) return false;

  const channel = msg.channel;
  const isDM = channel.type === ChannelType.DM;
  if (!isDM) {
    if (cfg.allowedChannelIds.length === 0) return false;
    const isThread = "isThread" in channel && channel.isThread();
    const targetId = isThread ? channel.parentId ?? channel.id : channel.id;
    if (!cfg.allowedChannelIds.includes(targetId)) return false;
  }
  if (cfg.allowedUserIds.length > 0 && !cfg.allowedUserIds.includes(msg.author.id)) {
    return false;
  }
  return true;
}

function isInteractionAllowed(
  cfg: AppConfig,
  interaction: ChatInputCommandInteraction | AutocompleteInteraction
): boolean {
  if (cfg.allowedUserIds.length > 0 && !cfg.allowedUserIds.includes(interaction.user.id)) {
    return false;
  }
  const isDM = interaction.channel?.type === ChannelType.DM || !interaction.guildId;
  if (!isDM) {
    if (cfg.allowedChannelIds.length === 0) return false;
    const channel = interaction.channel;
    const isThread = channel && "isThread" in channel && channel.isThread();
    const targetId = isThread ? channel.parentId ?? interaction.channelId : interaction.channelId;
    if (targetId && !cfg.allowedChannelIds.includes(targetId)) {
      return false;
    }
  }
  return true;
}

type HandledMessage = OmitPartialGroupDMChannel<Message<boolean>>;

function getCurrentModel(
  store: HistoryStore,
  cfg: AppConfig,
  userId: string,
  channelId: string
): string {
  return store.getModel(userId, channelId) ?? cfg.ollamaModel;
}

async function handleModelAutocomplete(
  interaction: AutocompleteInteraction,
  cfg: AppConfig,
  store: HistoryStore
): Promise<void> {
  const channelId = interaction.channelId;
  if (!channelId) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused().trim().toLowerCase();
  const current = getCurrentModel(store, cfg, interaction.user.id, channelId);

  let names = [current, cfg.ollamaModel];
  try {
    const models = await listOllamaModels(cfg.ollamaHost);
    names = [...names, ...models.map((model) => model.name)];
  } catch {
    /* ignore */
  }

  const choices = Array.from(new Set(names))
    .filter((name) => name && (!focused || name.toLowerCase().includes(focused)))
    .slice(0, 25)
    .map((name) => ({ name, value: name }));

  await interaction.respond(choices);
}

async function handleModelInteraction(
  interaction: ChatInputCommandInteraction,
  cfg: AppConfig,
  store: HistoryStore
): Promise<void> {
  const copy = getCopy(cfg.language).bot;
  const channelId = interaction.channelId;
  if (!channelId) {
    await interaction.reply({
      content: copy.channelInfoUnavailable,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const name = interaction.options.getString("name")?.trim() ?? "";
  if (!name) {
    const current = getCurrentModel(store, cfg, interaction.user.id, channelId);
    await interaction.reply({
      content: formatCurrentModel(cfg.language, current),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  store.setModel(interaction.user.id, channelId, name);
  await interaction.reply({
    content: formatSwitchedModel(cfg.language, name),
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCommand(
  msg: HandledMessage,
  content: string,
  cfg: AppConfig,
  store: HistoryStore
): Promise<boolean> {
  const copy = getCopy(cfg.language).bot;
  if (content === "!reset") {
    store.reset(msg.author.id, msg.channelId);
    await msg.reply(copy.historyReset);
    return true;
  }
  if (content.startsWith("!model")) {
    const name = content.slice("!model".length).trim();
    if (!name) {
      const current = getCurrentModel(store, cfg, msg.author.id, msg.channelId);
      await msg.reply(formatCurrentModel(cfg.language, current));
      return true;
    }
    store.setModel(msg.author.id, msg.channelId, name);
    await msg.reply(formatSwitchedModel(cfg.language, name));
    return true;
  }
  if (content === "!help") {
    await msg.reply([copy.helpTitle, ...copy.helpLines].join("\n"));
    return true;
  }
  return false;
}

async function handleThinkInteraction(
  interaction: ChatInputCommandInteraction,
  thinking: ThinkingStore,
  cfg: AppConfig
): Promise<void> {
  const copy = getCopy(cfg.language).bot;
  const mode = interaction.options.getString("mode", true);
  const userId = interaction.user.id;

  if (mode === "on") {
    thinking.setEnabled(userId, true);
    await interaction.reply({
      content: copy.thinkingOn,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (mode === "off") {
    thinking.setEnabled(userId, false);
    await interaction.reply({
      content: copy.thinkingOff,
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  if (mode === "status") {
    const label = thinking.isEnabled(userId)
      ? copy.thinkingOnLabel
      : copy.thinkingOffLabel;
    await interaction.reply({
      content: formatThinkingStatus(cfg.language, label),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
}

type ThreadableTextChannel = TextChannel | NewsChannel;

function isThreadableTextChannel(
  channel: HandledMessage["channel"]
): channel is ThreadableTextChannel {
  return (
    channel.type === ChannelType.GuildText ||
    channel.type === ChannelType.GuildAnnouncement
  );
}

async function ensureThread(
  msg: HandledMessage,
  fallbackTitle: string
): Promise<ThreadChannel | null> {
  const channel = msg.channel;
  if (!isThreadableTextChannel(channel)) return null;
  try {
    const existing = msg.thread;
    if (existing) return existing;
    return await msg.startThread({
      name: makeThreadName(msg.content ?? fallbackTitle, fallbackTitle),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
      reason: "AI auto-thread",
    });
  } catch (err) {
    console.error("[discord] failed to start thread:", err);
    return null;
  }
}

export function createBot(cfg: AppConfig): Client {
  const copy = getCopy(cfg.language).bot;
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  const store = new HistoryStore(cfg.historyTurns);
  const thinkingStore = new ThinkingStore();

  client.once(Events.ClientReady, async (c) => {
    console.log(`[discord] logged in as ${c.user.tag} (id=${c.user.id})`);
    console.log(
      `[discord] allowedUsers=${cfg.allowedUserIds.length || "*"} allowedChannels=${
        cfg.allowedChannelIds.length || `(${copy.allowedChannelsDmOnly})`
      } allowedGuilds=${cfg.allowedGuildIds.length || `(${copy.allowedGuildsAll})`} model=${cfg.ollamaModel}`
    );
    try {
      await registerSlashCommands(c, cfg.allowedGuildIds, cfg.language);
    } catch (err) {
      console.error("[discord] failed to register slash commands:", err);
    }
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        if (!isInteractionAllowed(cfg, interaction)) {
          await interaction.respond([]).catch(() => undefined);
          return;
        }
        if (interaction.commandName === "model") {
          await handleModelAutocomplete(interaction, cfg, store);
        }
        return;
      }

      if (!interaction.isChatInputCommand()) return;

      if (!isInteractionAllowed(cfg, interaction)) {
        await interaction.reply({
          content: copy.permissionDenied,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (interaction.commandName === "think") {
        await handleThinkInteraction(interaction, thinkingStore, cfg);
        return;
      }
      if (interaction.commandName === "model") {
        await handleModelInteraction(interaction, cfg, store);
        return;
      }
    } catch (err) {
      console.error("[discord] interaction error:", err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction
          .reply({ content: copy.commandFailed, flags: MessageFlags.Ephemeral })
          .catch(() => undefined);
      }
    }
  });

  client.on(Events.MessageCreate, async (rawMsg) => {
    const msg = rawMsg as HandledMessage;
    try {
      if (!isAllowed(cfg, msg)) return;
      const content = msg.content?.trim() ?? "";

      const attachments: DiscordAttachmentLike[] = Array.from(
        msg.attachments?.values() ?? []
      ).map((a) => ({
        url: a.url,
        contentType: a.contentType,
        name: a.name,
        size: a.size,
      }));
      const hasImageAttachment = attachments.some(isImageAttachment);

      if (!content && !hasImageAttachment) return;

      if (content.startsWith("!")) {
        const handled = await handleCommand(msg, content, cfg, store);
        if (handled) return;
      }

      const channel = msg.channel;
      let thread: ThreadChannel | null = null;
      if (isThreadableTextChannel(channel)) {
        thread = await ensureThread(msg, copy.defaultThreadTitle);
        if (!thread) {
          await msg.reply(copy.threadCreateFailed).catch(() => undefined);
          return;
        }
      }

      const historyChannelId = thread ? thread.id : msg.channelId;
      if (thread && msg.channelId !== historyChannelId) {
        const preselectedModel = store.getModel(msg.author.id, msg.channelId);
        if (preselectedModel && !store.getModel(msg.author.id, historyChannelId)) {
          store.setModel(msg.author.id, historyChannelId, preselectedModel);
        }
      }

      if (thread) {
        await thread.sendTyping().catch(() => undefined);
      } else if (channel.isSendable() && "sendTyping" in channel) {
        await channel.sendTyping().catch(() => undefined);
      }

      const model = getCurrentModel(store, cfg, msg.author.id, historyChannelId);
      const history = store.get(msg.author.id, historyChannelId);
      const think = thinkingStore.isEnabled(msg.author.id);

      const images = hasImageAttachment ? await downloadImagesAsBase64(attachments) : [];
      if (!content && images.length === 0) {
        await msg.reply(copy.imageNotLoaded).catch(() => undefined);
        return;
      }
      const promptText = content || copy.imagePromptPlaceholder;

      const userMessage: ChatMessage = { role: "user", content: promptText };
      if (images.length > 0) userMessage.images = images;

      const messages: ChatMessage[] = [
        { role: "system", content: cfg.systemPrompt },
        ...history,
        userMessage,
      ];

      let result;
      try {
        result = await ollamaChat({
          host: cfg.ollamaHost,
          model,
          messages,
          language: cfg.language,
          think,
        });
      } catch (err) {
        if (err instanceof OllamaVisionUnsupportedError) {
          await msg
            .reply(`⚠️ ${err.message}\n${copy.visionModelHelp}`)
            .catch(() => undefined);
          return;
        }
        throw err;
      }

      store.append(msg.author.id, historyChannelId, promptText, result.content);
      void logChat({
        userId: msg.author.id,
        channelId: historyChannelId,
        model,
        prompt: promptText,
        response: result.content,
        thinking: result.thinking,
      });

      const chunks = splitForDiscord(result.content);
      if (thread) {
        for (const part of chunks) {
          if (!part) continue;
          await thread.send(part);
        }
      } else {
        const first = chunks[0] ?? "";
        if (first) await msg.reply(first);
        for (let i = 1; i < chunks.length; i++) {
          const part = chunks[i];
          if (!part) continue;
          if (channel.isSendable()) await channel.send(part);
        }
      }

    } catch (err) {
      console.error("[discord] handler error:", err);
      try {
        await msg.reply(copy.localAiUnavailable);
      } catch {
        /* ignore */
      }
    }
  });

  return client;
}
