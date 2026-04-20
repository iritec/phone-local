import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";

const LOG_DIR = "logs";

export interface ChatLogEntry {
  ts: string;
  userId: string;
  channelId: string;
  model: string;
  prompt: string;
  response: string;
  thinking?: string;
}

function todayFile(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return join(LOG_DIR, `chat-${yyyy}-${mm}-${dd}.jsonl`);
}

export async function logChat(entry: Omit<ChatLogEntry, "ts">): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry }) + "\n";
    await appendFile(todayFile(), line, "utf8");
  } catch (err) {
    console.error("[logger] failed to write log:", err);
  }
}
