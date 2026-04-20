import { SlashCommandBuilder, type Client } from "discord.js";
import { getCopy, type SupportedLanguage } from "./i18n.js";

const ENGLISH_LOCALIZATIONS = ["en-US", "en-GB"] as const;

function englishLocalizations(value: string): Record<string, string> {
  return Object.fromEntries(ENGLISH_LOCALIZATIONS.map((locale) => [locale, value]));
}

export function buildThinkCommand(language: SupportedLanguage) {
  const current = getCopy(language).bot.commands.think;
  const ja = getCopy("ja").bot.commands.think;
  const en = getCopy("en").bot.commands.think;

  return new SlashCommandBuilder()
    .setName("think")
    .setDescription(current.description)
    .setDescriptionLocalizations({
      ja: ja.description,
      ...englishLocalizations(en.description),
    })
    .setDMPermission(true)
    .addStringOption((opt) =>
      opt
        .setName("mode")
        .setDescription(current.modeDescription)
        .setDescriptionLocalizations({
          ja: ja.modeDescription,
          ...englishLocalizations(en.modeDescription),
        })
        .setRequired(true)
        .addChoices(
          { name: "on", value: "on" },
          { name: "off", value: "off" },
          { name: "status", value: "status" }
        )
    )
    .toJSON();
}

export function buildModelCommand(language: SupportedLanguage) {
  const current = getCopy(language).bot.commands.model;
  const ja = getCopy("ja").bot.commands.model;
  const en = getCopy("en").bot.commands.model;

  return new SlashCommandBuilder()
    .setName("model")
    .setDescription(current.description)
    .setDescriptionLocalizations({
      ja: ja.description,
      ...englishLocalizations(en.description),
    })
    .setDMPermission(true)
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription(current.nameDescription)
        .setDescriptionLocalizations({
          ja: ja.nameDescription,
          ...englishLocalizations(en.nameDescription),
        })
        .setRequired(false)
        .setAutocomplete(true)
    )
    .toJSON();
}

export function buildAllCommands(language: SupportedLanguage) {
  return [buildThinkCommand(language), buildModelCommand(language)];
}

export async function registerSlashCommands(
  client: Client,
  allowedGuildIds: string[],
  language: SupportedLanguage
): Promise<void> {
  const copy = getCopy(language).bot;
  if (!client.application) {
    console.warn("[discord] application unavailable, skip command registration");
    return;
  }

  const commands = buildAllCommands(language);

  const targetGuildIds =
    allowedGuildIds.length > 0
      ? allowedGuildIds
      : Array.from(client.guilds.cache.keys());

  if (targetGuildIds.length === 0) {
    console.warn(copy.noTargetGuilds);
    return;
  }

  const registeredNames: string[] = [];
  for (const guildId of targetGuildIds) {
    try {
      const registered = await client.application.commands.set(commands, guildId);
      registeredNames.push(
        `${guildId}:[${registered.map((c) => `/${c.name}`).join(", ")}]`
      );
    } catch (err) {
      console.error(`[discord] failed to register commands for guild ${guildId}:`, err);
    }
  }

  console.log(`[discord] slash commands registered → ${registeredNames.join(" ")}`);
}
