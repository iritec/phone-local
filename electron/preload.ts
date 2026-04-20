import { contextBridge, ipcRenderer } from "electron";
import type { SupportedLanguage, UiCopy } from "../src/i18n.js";

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

export type BotStatus = "stopped" | "starting" | "running" | "stopping" | "error";

export interface BotStatusPayload {
  status: BotStatus;
  error?: string;
}

export interface OllamaModelInfo {
  name: string;
}

export interface UiContext {
  language: SupportedLanguage;
  copy: UiCopy;
}

const uiContext = ipcRenderer.sendSync("app:get-ui-context-sync") as UiContext;

const api = {
  uiContext,
  getSettings: (): Promise<StoredSettings> => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch: Partial<StoredSettings>): Promise<StoredSettings> =>
    ipcRenderer.invoke("settings:update", patch),
  getStatus: (): Promise<BotStatusPayload> => ipcRenderer.invoke("bot:status"),
  startBot: (): Promise<BotStatusPayload> => ipcRenderer.invoke("bot:start"),
  stopBot: (): Promise<BotStatusPayload> => ipcRenderer.invoke("bot:stop"),
  listOllamaModels: (host?: string): Promise<OllamaModelInfo[]> =>
    ipcRenderer.invoke("ollama:list-models", host),
  onStatusChanged: (listener: (payload: BotStatusPayload) => void) => {
    const handler = (_: unknown, payload: BotStatusPayload) => listener(payload);
    ipcRenderer.on("bot:status-changed", handler);
    return () => ipcRenderer.removeListener("bot:status-changed", handler);
  },
};

contextBridge.exposeInMainWorld("phonelocal", api);

export type PhoneLocalApi = typeof api;
