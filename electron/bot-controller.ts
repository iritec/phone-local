import { EventEmitter } from "node:events";
import type { Client } from "discord.js";
import { buildConfig } from "../src/config.js";
import { createBot } from "../src/discord.js";
import type { SupportedLanguage } from "../src/i18n.js";
import type { StoredSettings } from "./settings-store.js";

export type BotStatus = "stopped" | "starting" | "running" | "stopping" | "error";

export interface BotStatusPayload {
  status: BotStatus;
  error?: string;
}

export class BotController extends EventEmitter {
  private client: Client | null = null;
  private status: BotStatus = "stopped";
  private lastError?: string;

  getState(): BotStatusPayload {
    return this.lastError ? { status: this.status, error: this.lastError } : { status: this.status };
  }

  private setStatus(next: BotStatus, error?: string): void {
    this.status = next;
    this.lastError = error;
    this.emit("status", this.getState());
  }

  async start(
    settings: StoredSettings,
    language: SupportedLanguage
  ): Promise<BotStatusPayload> {
    if (this.status === "running" || this.status === "starting") {
      return this.getState();
    }
    this.setStatus("starting");
    try {
      const cfg = buildConfig({
        language,
        discordToken: settings.discordToken,
        ollamaHost: settings.ollamaHost,
        ollamaModel: settings.ollamaModel,
        systemPrompt: settings.systemPrompt,
        historyTurns: settings.historyTurns,
        allowedUserIds: settings.allowedUserIds,
        allowedChannelIds: settings.allowedChannelIds,
        allowedGuildIds: settings.allowedGuildIds,
      });

      const client = createBot(cfg);
      this.client = client;

      client.on("error", (err) => {
        console.error("[bot] client error:", err);
      });

      await client.login(cfg.discordToken);
      this.setStatus("running");
      return this.getState();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[bot] start failed:", err);
      try {
        await this.client?.destroy();
      } catch {
        /* ignore */
      }
      this.client = null;
      this.setStatus("error", msg);
      return this.getState();
    }
  }

  async stop(): Promise<BotStatusPayload> {
    if (this.status === "stopped" || this.status === "stopping") {
      return this.getState();
    }
    this.setStatus("stopping");
    try {
      await this.client?.destroy();
    } catch (err) {
      console.error("[bot] stop error:", err);
    } finally {
      this.client = null;
      this.setStatus("stopped");
    }
    return this.getState();
  }
}
