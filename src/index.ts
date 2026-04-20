import "dotenv/config";
import { loadConfigFromEnv } from "./config.js";
import { createBot } from "./discord.js";

async function main(): Promise<void> {
  let cfg;
  try {
    cfg = loadConfigFromEnv();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[config] ${msg}`);
    process.exit(1);
  }

  const client = createBot(cfg);

  const shutdown = async (signal: string) => {
    console.log(`[index] received ${signal}, shutting down...`);
    try {
      await client.destroy();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  try {
    await client.login(cfg.discordToken);
  } catch (err) {
    console.error("[discord] login failed:", err);
    process.exit(1);
  }
}

void main();
