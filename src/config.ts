import {
  getCopy,
  resolveLanguageFromEnv,
  type SupportedLanguage,
} from "./i18n.js";

const DEFAULT_OLLAMA_HOST = "http://127.0.0.1:11434";
const DEFAULT_OLLAMA_MODEL = "gemma4:26b";
const DEFAULT_HISTORY_TURNS = 8;

function parseCsv(value: string | undefined | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseIntSafe(value: string | undefined | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export interface AppConfig {
  language: SupportedLanguage;
  discordToken: string;
  allowedUserIds: string[];
  allowedChannelIds: string[];
  allowedGuildIds: string[];
  ollamaHost: string;
  ollamaModel: string;
  systemPrompt: string;
  historyTurns: number;
}

export interface AppConfigInput {
  language?: SupportedLanguage | null;
  discordToken?: string | null;
  allowedUserIds?: string[] | string | null;
  allowedChannelIds?: string[] | string | null;
  allowedGuildIds?: string[] | string | null;
  ollamaHost?: string | null;
  ollamaModel?: string | null;
  systemPrompt?: string | null;
  historyTurns?: number | string | null;
}

function toArray(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) return value.map((v) => v.trim()).filter((v) => v.length > 0);
  return parseCsv(value ?? undefined);
}

export function buildConfig(input: AppConfigInput): AppConfig {
  const language = input.language ?? resolveLanguageFromEnv();
  const copy = getCopy(language);
  const discordToken = (input.discordToken ?? "").trim();
  if (!discordToken) {
    throw new Error(copy.config.missingDiscordToken);
  }

  const host = (input.ollamaHost ?? DEFAULT_OLLAMA_HOST).replace(/\/$/, "");
  const model = (input.ollamaModel ?? "").trim() || DEFAULT_OLLAMA_MODEL;
  const systemPrompt = (input.systemPrompt ?? "").trim() || copy.config.defaultSystemPrompt;
  const historyTurns =
    typeof input.historyTurns === "number" && Number.isFinite(input.historyTurns) && input.historyTurns > 0
      ? Math.floor(input.historyTurns)
      : parseIntSafe(
          typeof input.historyTurns === "string" ? input.historyTurns : undefined,
          DEFAULT_HISTORY_TURNS
        );

  return {
    language,
    discordToken,
    allowedUserIds: toArray(input.allowedUserIds),
    allowedChannelIds: toArray(input.allowedChannelIds),
    allowedGuildIds: toArray(input.allowedGuildIds),
    ollamaHost: host,
    ollamaModel: model,
    systemPrompt,
    historyTurns,
  };
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const language = resolveLanguageFromEnv(env);
  return buildConfig({
    language,
    discordToken: env.DISCORD_TOKEN,
    allowedUserIds: env.ALLOWED_USER_IDS,
    allowedChannelIds: env.ALLOWED_CHANNEL_IDS,
    allowedGuildIds: env.ALLOWED_GUILD_IDS,
    ollamaHost: env.OLLAMA_HOST,
    ollamaModel: env.OLLAMA_MODEL,
    systemPrompt: env.SYSTEM_PROMPT,
    historyTurns: env.HISTORY_TURNS,
  });
}

export function getConfigDefaults(language: SupportedLanguage = "en") {
  const copy = getCopy(language);
  return {
    ollamaHost: DEFAULT_OLLAMA_HOST,
    ollamaModel: DEFAULT_OLLAMA_MODEL,
    historyTurns: DEFAULT_HISTORY_TURNS,
    systemPrompt: copy.config.defaultSystemPrompt,
  } as const;
}
