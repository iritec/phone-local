import {
  formatVisionUnsupported,
  getOllamaEmptyResponseMessage,
  type SupportedLanguage,
} from "./i18n.js";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
  images?: string[];
}

export class OllamaVisionUnsupportedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OllamaVisionUnsupportedError";
  }
}

export interface OllamaChatOptions {
  host: string;
  model: string;
  messages: ChatMessage[];
  language?: SupportedLanguage;
  think?: boolean;
  signal?: AbortSignal;
}

export interface OllamaChatResult {
  content: string;
  thinking?: string;
}

export interface OllamaModelInfo {
  name: string;
}

interface OllamaChatResponse {
  message?: { role: string; content: string; thinking?: string };
  error?: string;
}

interface OllamaTagsResponse {
  models?: Array<{ name?: string | null }>;
}

function looksLikeVisionUnsupported(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("does not support image") ||
    lower.includes("image input is not supported") ||
    lower.includes("no vision") ||
    lower.includes("not a vision") ||
    lower.includes("unsupported modality") ||
    lower.includes("images are not supported")
  );
}

export async function ollamaChat(opts: OllamaChatOptions): Promise<OllamaChatResult> {
  const language = opts.language ?? "en";
  const url = `${opts.host}/api/chat`;
  const hasImages = opts.messages.some((m) => m.images && m.images.length > 0);
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: opts.messages,
    stream: false,
  };
  if (opts.think) body.think = true;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (hasImages && looksLikeVisionUnsupported(text)) {
      throw new OllamaVisionUnsupportedError(
        formatVisionUnsupported(language, opts.model)
      );
    }
    throw new Error(`Ollama ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  if (data.error) {
    if (hasImages && looksLikeVisionUnsupported(data.error)) {
      throw new OllamaVisionUnsupportedError(
        formatVisionUnsupported(language, opts.model)
      );
    }
    throw new Error(`Ollama error: ${data.error}`);
  }
  const content = data.message?.content?.trim();
  if (!content) {
    throw new Error(getOllamaEmptyResponseMessage(language));
  }

  const result: OllamaChatResult = { content };
  if (opts.think) {
    const thinking = data.message?.thinking?.trim();
    if (thinking) result.thinking = thinking;
  }
  return result;
}

export async function listOllamaModels(
  host: string,
  signal?: AbortSignal
): Promise<OllamaModelInfo[]> {
  const url = `${host.replace(/\/$/, "")}/api/tags`;
  const res = await fetch(url, { signal });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama ${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as OllamaTagsResponse;
  const uniqueNames = Array.from(
    new Set(
      (data.models ?? [])
        .map((model) => model.name?.trim() ?? "")
        .filter((name) => name.length > 0)
    )
  );

  uniqueNames.sort((a, b) => a.localeCompare(b));
  return uniqueNames.map((name) => ({ name }));
}
