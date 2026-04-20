![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Platform: macOS](https://img.shields.io/badge/Platform-macOS-lightgrey)
![Node: >=20](https://img.shields.io/badge/Node-%3E%3D20-brightgreen)

# phone-local

phone-local is a macOS menu bar app that bridges Discord messages to a local Ollama LLM. Your conversations stay on your Mac — Discord is just the chat surface, and Ollama does the thinking locally.

<div align="center">
  <img src="build/icon.png" alt="phone-local" width="160" height="160" />
</div>

> _Screenshots of the menu bar UI and Discord conversation will be added here._

## Features

- Forwards Discord messages (DMs or allowed channels) to a local Ollama model and posts the reply back
- Lives in the macOS menu bar (Dock-hidden) with a settings window for token, host, and model
- Slash commands: per-channel AI on/off, per-user thinking mode, runtime model switching
- Conversation history persisted to `./logs/chat-YYYY-MM-DD.jsonl`
- Settings persisted via `electron-store`; `.env` is auto-imported on first launch
- CLI mode for headless / server use

## Requirements

- macOS (Apple Silicon or Intel)
- Node.js `20+`
- [pnpm](https://pnpm.io/installation)
- [Ollama](https://ollama.com) running locally
- A Discord bot token

## Discord Bot Setup

1. Open <https://discord.com/developers/applications> and click **New Application**.
2. Go to the **Bot** tab and click **Add Bot**.
3. Under **Privileged Gateway Intents**, enable **MESSAGE CONTENT INTENT**.
4. Click **Reset Token** (or **Copy**) and save it — this is your `DISCORD_TOKEN`.
5. Open **OAuth2 → URL Generator**:
   - Scopes: check **`bot`** and **`applications.commands`**
   - Bot Permissions: **View Channels**, **Send Messages**, **Read Message History**
6. Open the generated URL and invite the bot to your server.
7. Get your own Discord User ID:
   - Discord Settings → **Advanced** → enable **Developer Mode**
   - Right-click your username → **Copy User ID**
   - Put it into `ALLOWED_USER_IDS` so only you can talk to the bot

> If the bot was previously invited without the `applications.commands` scope, re-invite it with the URL above so slash commands appear.

## Ollama Setup

```bash
brew install ollama
ollama serve              # leave running in another terminal
ollama pull gemma4:26b    # or any chat-capable model
ollama list               # confirm it's installed
```

## Quick Start

```bash
git clone https://github.com/iritec/iritec.git phone-local
cd phone-local
pnpm install
cp .env.example .env
# Edit .env with your Discord token and IDs
pnpm start                # builds and launches the menu bar app
```

After launch, click the `PL` icon in the menu bar to open settings, paste your Discord token and Ollama details, then press **Start Bot**.

- The app stays out of the Dock (menu bar only)
- Settings live at `~/Library/Application Support/phone-local/settings.json`
- An existing `.env` is auto-imported into the GUI on first launch

### CLI mode

```bash
pnpm run cli              # runs the bot from .env without Electron
pnpm typecheck
```

### Build a DMG

```bash
pnpm run dist:mac         # output goes to release/
```

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | ✅ | — | Discord bot token from the developer portal |
| `ALLOWED_USER_IDS` | — | _(empty = allow everyone)_ | Comma-separated user IDs allowed to use the bot. **Set this for personal use.** |
| `ALLOWED_CHANNEL_IDS` | — | _(empty = DMs only)_ | Comma-separated channel IDs the bot will respond in |
| `ALLOWED_GUILD_IDS` | — | _(empty = all joined guilds)_ | Comma-separated guild IDs for slash command registration |
| `OLLAMA_HOST` | — | `http://127.0.0.1:11434` | Local Ollama server URL |
| `OLLAMA_MODEL` | — | `gemma4:26b` | Default model name |
| `SYSTEM_PROMPT` | — | _(default assistant prompt)_ | Custom system prompt for every conversation |
| `HISTORY_TURNS` | — | `8` | Conversation turns kept in memory |
| `LANG` | — | `en` | UI language: `en` or `ja` |

## Commands

### Message commands (in message body)

- `!reset` — clear the current conversation history
- `!model <name>` — switch the model for this conversation (resets on restart)
- `!help` — show inline help

### Slash commands

Registered automatically per guild on bot startup.

- `/ai mode:on|off|status` — toggle AI replies for the current channel (persisted in `./data/ai-state.json`)
- `/think on|off|status` — per-user thinking mode. When on, Ollama's internal thinking is captured into `./logs/chat-*.jsonl` while only the final response is sent to Discord
- `/model` — show the current model, or `/model name:<model>` to switch (autocompletes from Ollama's installed models)

## Security notes

- **Always set `ALLOWED_USER_IDS`** for personal use — without it, anyone who can find the bot can talk to it.
- `.env` is gitignored. Never commit your token.
- Designed for personal / self-hosted use; not hardened for public multi-tenant deployment.

## License

[MIT](LICENSE) © 2024 Shingo Irie
