import type { ChatMessage } from "./ollama.js";

type SessionKey = string;

interface Session {
  messages: ChatMessage[];
  model?: string;
}

function keyOf(userId: string, channelId: string): SessionKey {
  return `${userId}::${channelId}`;
}

export class HistoryStore {
  private readonly sessions = new Map<SessionKey, Session>();

  constructor(private readonly maxTurns: number) {}

  private getOrCreate(key: SessionKey): Session {
    let s = this.sessions.get(key);
    if (!s) {
      s = { messages: [] };
      this.sessions.set(key, s);
    }
    return s;
  }

  get(userId: string, channelId: string): ChatMessage[] {
    return this.sessions.get(keyOf(userId, channelId))?.messages ?? [];
  }

  getModel(userId: string, channelId: string): string | undefined {
    return this.sessions.get(keyOf(userId, channelId))?.model;
  }

  setModel(userId: string, channelId: string, model: string): void {
    const s = this.getOrCreate(keyOf(userId, channelId));
    s.model = model;
  }

  append(userId: string, channelId: string, user: string, assistant: string): void {
    const s = this.getOrCreate(keyOf(userId, channelId));
    s.messages.push({ role: "user", content: user });
    s.messages.push({ role: "assistant", content: assistant });
    const maxMessages = this.maxTurns * 2;
    if (s.messages.length > maxMessages) {
      s.messages.splice(0, s.messages.length - maxMessages);
    }
  }

  reset(userId: string, channelId: string): void {
    const key = keyOf(userId, channelId);
    const s = this.sessions.get(key);
    if (s) s.messages = [];
  }
}
