import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DEFAULT_PATH = "./data/thinking.json";

interface PersistedData {
  users: Record<string, boolean>;
}

function isPersistedData(v: unknown): v is PersistedData {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as { users?: unknown }).users === "object" &&
    (v as { users?: unknown }).users !== null
  );
}

export class ThinkingStore {
  private data: PersistedData = { users: {} };

  constructor(private readonly path: string = DEFAULT_PATH) {
    this.load();
  }

  private load(): void {
    try {
      if (!existsSync(this.path)) return;
      const raw = readFileSync(this.path, "utf8");
      const parsed: unknown = JSON.parse(raw);
      if (isPersistedData(parsed)) {
        this.data = {
          users: Object.fromEntries(
            Object.entries(parsed.users).filter(([, v]) => typeof v === "boolean")
          ) as Record<string, boolean>,
        };
      }
    } catch (err) {
      console.error("[thinking-store] failed to load:", err);
    }
  }

  private save(): void {
    try {
      mkdirSync(dirname(this.path), { recursive: true });
      writeFileSync(this.path, JSON.stringify(this.data, null, 2), "utf8");
    } catch (err) {
      console.error("[thinking-store] failed to save:", err);
    }
  }

  isEnabled(userId: string): boolean {
    return this.data.users[userId] === true;
  }

  setEnabled(userId: string, on: boolean): void {
    if (on) {
      this.data.users[userId] = true;
    } else {
      delete this.data.users[userId];
    }
    this.save();
  }
}
