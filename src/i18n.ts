export type SupportedLanguage = "ja" | "en";

export interface UiCopy {
  windowTitle: string;
  brandSub: string;
  status: {
    loading: string;
    stopped: string;
    starting: string;
    running: string;
    stopping: string;
    error: string;
    unknown: string;
  };
  labels: {
    discordToken: string;
    allowedChannelIds: string;
    allowedChannelHint: string;
    ollamaModel: string;
    ollamaEndpoint: string;
    autoLaunch: string;
  };
  buttons: {
    reload: string;
    saveSettings: string;
    startBot: string;
    stopBot: string;
  };
  hints: {
    initialModelHint: string;
    loadingModels: string;
    noModelFound: string;
    noModelsAvailable: string;
    loadModelsFailed: string;
    saved: string;
    saveFailed: string;
    startFailed: string;
  };
  menu: {
    openSettings: string;
    quit: string;
  };
}

export interface BotCopy {
  defaultThreadTitle: string;
  channelInfoUnavailable: string;
  historyReset: string;
  helpTitle: string;
  helpLines: string[];
  thinkingOn: string;
  thinkingOff: string;
  thinkingOnLabel: string;
  thinkingOffLabel: string;
  permissionDenied: string;
  commandFailed: string;
  threadCreateFailed: string;
  imageNotLoaded: string;
  imagePromptPlaceholder: string;
  visionModelHelp: string;
  localAiUnavailable: string;
  allowedChannelsDmOnly: string;
  allowedGuildsAll: string;
  noTargetGuilds: string;
  commands: {
    think: {
      description: string;
      modeDescription: string;
    };
    model: {
      description: string;
      nameDescription: string;
    };
  };
}

export interface ConfigCopy {
  defaultSystemPrompt: string;
  missingDiscordToken: string;
}

export interface LocaleCopy {
  ui: UiCopy;
  bot: BotCopy;
  config: ConfigCopy;
}

const COPY: Record<SupportedLanguage, LocaleCopy> = {
  ja: {
    ui: {
      windowTitle: "PhoneLocal 設定",
      brandSub: "Discord × ローカルLLM",
      status: {
        loading: "読込中…",
        stopped: "停止中",
        starting: "起動中…",
        running: "稼働中",
        stopping: "停止中…",
        error: "エラー",
        unknown: "—",
      },
      labels: {
        discordToken: "Discord Bot Token",
        allowedChannelIds: "反応するチャンネルID",
        allowedChannelHint: "カンマ区切り。空なら DM のみ",
        ollamaModel: "Ollama モデル",
        ollamaEndpoint: "Ollama エンドポイント",
        autoLaunch: "Mac起動時に自動で立ち上げる",
      },
      buttons: {
        reload: "更新",
        saveSettings: "設定を保存",
        startBot: "ボットを起動",
        stopBot: "ボットを停止",
      },
      hints: {
        initialModelHint: "Ollama から利用可能なモデルを読み込みます",
        loadingModels: "モデル一覧を読み込み中…",
        noModelFound: "モデルが見つかりません",
        noModelsAvailable: "利用可能なモデルがありません",
        loadModelsFailed: "モデル一覧の取得に失敗しました",
        saved: "保存しました",
        saveFailed: "保存に失敗しました",
        startFailed: "起動に失敗しました",
      },
      menu: {
        openSettings: "設定を開く",
        quit: "終了",
      },
    },
    bot: {
      defaultThreadTitle: "AI 会話",
      channelInfoUnavailable: "チャンネル情報を取得できませんでした。",
      historyReset: "履歴をリセットしました。",
      helpTitle: "**使い方**",
      helpLines: [
        "- チャンネルにメッセージを送ると自動でスレッドが作成され、その中でローカル LLM (Ollama) が返信します。",
        "- スレッド内での返信はそのまま会話として継続します。",
        "- `/think on` / `/think off` / `/think status` thinking モードを切替 (Discord には content のみ、thinking はログにのみ保存)",
        "- `/model` 現在のモデルを確認、`/model name:<model>` でこの会話のモデルを切替",
        "- `!reset` 会話履歴をリセット",
        "- `!model <name>` この会話のモデルを切替 (例: `!model gemma4:26b`)",
        "- `!help` このヘルプを表示",
      ],
      thinkingOn: "🧠 thinking を ON にしました",
      thinkingOff: "⚡ thinking を OFF にしました",
      thinkingOnLabel: "ON 🧠",
      thinkingOffLabel: "OFF ⚡",
      permissionDenied: "このコマンドを実行する権限がありません。",
      commandFailed: "コマンド処理に失敗しました。",
      threadCreateFailed:
        "⚠️ スレッドを作成できませんでした。Bot の権限 (Create Public Threads) を確認してください。",
      imageNotLoaded: "⚠️ 画像を取り込めませんでした (サイズ上限 20MB / 最大 4 枚)。",
      imagePromptPlaceholder: "(画像)",
      visionModelHelp:
        "画像対応モデル (例: `gemma3`) を `/model` または `!model <name>` で切り替えてください。",
      localAiUnavailable:
        "⚠️ ローカルAIに接続できませんでした。Ollama が起動しているか確認してください。",
      allowedChannelsDmOnly: "DMのみ",
      allowedGuildsAll: "全参加ギルド",
      noTargetGuilds:
        "[discord] no target guilds for slash commands. ALLOWED_GUILD_IDS を設定するか、Bot をサーバーに招待してください。",
      commands: {
        think: {
          description: "Ollama の thinking モードを切り替える",
          modeDescription: "on / off / status",
        },
        model: {
          description: "この会話の Ollama モデルを確認または切り替える",
          nameDescription: "切り替え先のモデル名",
        },
      },
    },
    config: {
      defaultSystemPrompt:
        "あなたは日本語で答える丁寧で簡潔なアシスタントです。回答はわかりやすく、必要以上に長くしないでください。",
      missingDiscordToken:
        "DISCORD_TOKEN が設定されていません。設定画面で Discord Bot Token を入力してください。",
    },
  },
  en: {
    ui: {
      windowTitle: "PhoneLocal Settings",
      brandSub: "Discord × Local LLM",
      status: {
        loading: "Loading…",
        stopped: "Stopped",
        starting: "Starting…",
        running: "Running",
        stopping: "Stopping…",
        error: "Error",
        unknown: "—",
      },
      labels: {
        discordToken: "Discord Bot Token",
        allowedChannelIds: "Channel IDs to respond in",
        allowedChannelHint: "Comma-separated. Leave empty for DMs only",
        ollamaModel: "Ollama Model",
        ollamaEndpoint: "Ollama Endpoint",
        autoLaunch: "Launch automatically at login",
      },
      buttons: {
        reload: "Reload",
        saveSettings: "Save Settings",
        startBot: "Start Bot",
        stopBot: "Stop Bot",
      },
      hints: {
        initialModelHint: "Loads available models from Ollama",
        loadingModels: "Loading models…",
        noModelFound: "No models found",
        noModelsAvailable: "No models available",
        loadModelsFailed: "Failed to load models",
        saved: "Saved",
        saveFailed: "Failed to save settings",
        startFailed: "Failed to start the bot",
      },
      menu: {
        openSettings: "Open Settings",
        quit: "Quit",
      },
    },
    bot: {
      defaultThreadTitle: "AI Chat",
      channelInfoUnavailable: "Could not get the channel information.",
      historyReset: "History reset.",
      helpTitle: "**Usage**",
      helpLines: [
        "- Send a message in a channel and a thread is created automatically. The local LLM (Ollama) replies inside that thread.",
        "- Replies inside the thread continue the same conversation.",
        "- `/think on` / `/think off` / `/think status` toggles thinking mode (Discord receives content only, thinking is saved to logs only).",
        "- `/model` shows the current model, and `/model name:<model>` switches the model for this conversation.",
        "- `!reset` resets the conversation history.",
        "- `!model <name>` switches the model for this conversation (example: `!model gemma4:26b`).",
        "- `!help` shows this help message.",
      ],
      thinkingOn: "🧠 Thinking turned ON",
      thinkingOff: "⚡ Thinking turned OFF",
      thinkingOnLabel: "ON 🧠",
      thinkingOffLabel: "OFF ⚡",
      permissionDenied: "You do not have permission to use this command.",
      commandFailed: "Failed to process the command.",
      threadCreateFailed:
        "⚠️ Could not create a thread. Check that the bot has the Create Public Threads permission.",
      imageNotLoaded: "⚠️ Could not import the image (max 20MB, up to 4 images).",
      imagePromptPlaceholder: "(image)",
      visionModelHelp:
        "Switch to a vision-capable model (for example `gemma3`) with `/model` or `!model <name>`.",
      localAiUnavailable:
        "⚠️ Could not connect to the local AI. Make sure Ollama is running.",
      allowedChannelsDmOnly: "DM only",
      allowedGuildsAll: "all joined guilds",
      noTargetGuilds:
        "[discord] no target guilds for slash commands. Set ALLOWED_GUILD_IDS or invite the bot to a server.",
      commands: {
        think: {
          description: "Toggle Ollama thinking mode",
          modeDescription: "on / off / status",
        },
        model: {
          description: "Show or change the Ollama model for this conversation",
          nameDescription: "Model name to switch to",
        },
      },
    },
    config: {
      defaultSystemPrompt:
        "You are a polite and concise assistant that replies in English. Keep answers clear and avoid unnecessary length.",
      missingDiscordToken:
        "DISCORD_TOKEN is not configured. Enter the Discord Bot Token in the settings window.",
    },
  },
};

export function resolveLanguage(
  input?: string | readonly string[] | null
): SupportedLanguage {
  const candidates = Array.isArray(input) ? input : [input];
  for (const raw of candidates) {
    const value = `${raw ?? ""}`.trim().toLowerCase();
    if (!value) continue;
    if (value.startsWith("ja")) return "ja";
    return "en";
  }
  return "en";
}

export function resolveLanguageFromEnv(
  env: NodeJS.ProcessEnv = process.env
): SupportedLanguage {
  const language = env.LANGUAGE?.split(":")[0];
  const candidates = [env.LC_ALL, env.LC_MESSAGES, language, env.LANG].filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  return resolveLanguage(candidates);
}

export function getCopy(language: SupportedLanguage): LocaleCopy {
  return COPY[language];
}

export function formatModelCount(language: SupportedLanguage, count: number): string {
  if (language === "ja") {
    return `${count}件のモデルを読み込みました`;
  }
  return `Loaded ${count} model${count === 1 ? "" : "s"}`;
}

export function formatCurrentModel(language: SupportedLanguage, model: string): string {
  if (language === "ja") {
    return `現在のモデル: \`${model}\``;
  }
  return `Current model: \`${model}\``;
}

export function formatSwitchedModel(language: SupportedLanguage, model: string): string {
  if (language === "ja") {
    return `モデルを \`${model}\` に切り替えました (この会話のみ)。`;
  }
  return `Switched to \`${model}\` for this conversation only.`;
}

export function formatThinkingStatus(
  language: SupportedLanguage,
  label: string
): string {
  if (language === "ja") {
    return `現在の thinking: **${label}**`;
  }
  return `Current thinking: **${label}**`;
}

export function formatVisionUnsupported(language: SupportedLanguage, model: string): string {
  if (language === "ja") {
    return `選択中のモデル \`${model}\` は画像入力に対応していません。`;
  }
  return `The selected model \`${model}\` does not support image input.`;
}

export function getOllamaEmptyResponseMessage(language: SupportedLanguage): string {
  if (language === "ja") {
    return "Ollama から空の応答が返りました。";
  }
  return "Ollama returned an empty response.";
}
