import Store from "electron-store";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { app } from "electron";

export interface StoredSettings {
  discordToken: string;
  ollamaHost: string;
  ollamaModel: string;
  autoLaunch: boolean;
  allowedUserIds: string[];
  allowedChannelIds: string[];
  allowedGuildIds: string[];
  systemPrompt: string;
  historyTurns: number;
  migratedFromEnv: boolean;
}

const DEFAULTS: StoredSettings = {
  discordToken: "",
  ollamaHost: "http://localhost:11434",
  ollamaModel: "gemma4:26b",
  autoLaunch: false,
  allowedUserIds: [],
  allowedChannelIds: [],
  allowedGuildIds: [],
  systemPrompt: "",
  historyTurns: 8,
  migratedFromEnv: false,
};

type StoreSchema = { settings: StoredSettings };

const store = new Store<StoreSchema>({
  name: "settings",
  defaults: { settings: DEFAULTS },
});

function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  const raw = readFileSync(path, "utf8");
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseIntSafe(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readCurrent(): StoredSettings {
  const stored = (store.get("settings") as Partial<StoredSettings> | undefined) ?? {};
  return { ...DEFAULTS, ...stored };
}

function write(next: StoredSettings): void {
  store.set("settings", next);
}

export function getSettings(): StoredSettings {
  return readCurrent();
}

export function updateSettings(patch: Partial<StoredSettings>): StoredSettings {
  const next: StoredSettings = { ...readCurrent(), ...patch };
  write(next);
  return next;
}

export function migrateFromDotEnvIfNeeded(): StoredSettings {
  const current = readCurrent();
  if (current.migratedFromEnv) return current;

  const candidatePaths = [
    join(process.cwd(), ".env"),
    join(dirname(app.getAppPath()), ".env"),
    join(app.getAppPath(), ".env"),
  ];
  let envPath: string | null = null;
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      envPath = p;
      break;
    }
  }
  if (!envPath) {
    const next = { ...current, migratedFromEnv: true };
    write(next);
    return next;
  }

  const env = parseEnvFile(envPath);
  const next: StoredSettings = {
    ...current,
    discordToken: current.discordToken || (env.DISCORD_TOKEN ?? "").trim(),
    ollamaHost: current.ollamaHost || (env.OLLAMA_HOST ?? DEFAULTS.ollamaHost).trim(),
    ollamaModel: current.ollamaModel || (env.OLLAMA_MODEL ?? DEFAULTS.ollamaModel).trim(),
    systemPrompt: current.systemPrompt || (env.SYSTEM_PROMPT ?? "").trim(),
    historyTurns:
      current.historyTurns && current.historyTurns > 0
        ? current.historyTurns
        : parseIntSafe(env.HISTORY_TURNS, DEFAULTS.historyTurns),
    allowedUserIds:
      current.allowedUserIds.length > 0 ? current.allowedUserIds : parseCsv(env.ALLOWED_USER_IDS),
    allowedChannelIds:
      current.allowedChannelIds.length > 0
        ? current.allowedChannelIds
        : parseCsv(env.ALLOWED_CHANNEL_IDS),
    allowedGuildIds:
      current.allowedGuildIds.length > 0 ? current.allowedGuildIds : parseCsv(env.ALLOWED_GUILD_IDS),
    migratedFromEnv: true,
  };
  write(next);
  return next;
}

export function getStorePath(): string {
  return store.path;
}
