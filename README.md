<div align="center">
  <img src="build/icon.png" alt="PhoneLocal app icon" width="160" />
  <p><strong>Local-first Discord companion for Ollama on macOS</strong></p>
  <p>Run a personal Discord bot from your menu bar, keep the model local, and ship notarized macOS builds.</p>
  <p>
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="MIT License" />
    <img src="https://img.shields.io/badge/Platform-macOS-lightgrey" alt="macOS" />
    <img src="https://img.shields.io/badge/Node-%3E%3D20-brightgreen" alt="Node 20+" />
    <img src="https://img.shields.io/badge/Ollama-local%20only-111827" alt="Local Ollama" />
  </p>
</div>

## Overview

PhoneLocal is a menu bar app for macOS that connects a Discord bot to a local Ollama model.
Discord acts as the chat surface, while inference stays on your Mac.

It is designed for personal or small-team self-hosted use:

- Run the bot from a menu bar app instead of a remote server
- Keep prompts, replies, and optional thinking logs on local storage
- Control who can use the bot with Discord user, channel, and guild allowlists
- Switch models per conversation and toggle thinking mode without leaving Discord

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="docs/assets/screenshot-settings.png" alt="PhoneLocal settings window" />
    </td>
    <td width="50%">
      <img src="docs/assets/screenshot-discord.png" alt="Discord conversation with PhoneLocal" />
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Menu bar settings</strong></td>
    <td align="center"><strong>Discord chat flow</strong></td>
  </tr>
</table>

## Features

- Menu bar-first macOS app with a compact settings window
- Discord bot replies powered by a local Ollama endpoint
- Per-channel AI enablement with `/ai`
- Per-user thinking mode with `/think`
- Per-conversation model switching with `/model` or `!model`
- Optional image handling when you choose a vision-capable Ollama model
- Conversation history and thinking logs stored locally in JSONL files
- Settings window setup with optional local `.env` import
- Notarization-ready macOS release pipeline

## Why local-first

- Your Discord token is stored locally through `electron-store`
- Ollama runs on your machine at `http://127.0.0.1:11434` by default
- Chat history is written to local files in `./logs/`
- Runtime state such as AI enablement and thinking preferences stays in `./data/`
- No hosted backend is required for the core workflow

## Requirements

- macOS
- Node.js `20+`
- [pnpm](https://pnpm.io/installation)
- [Ollama](https://ollama.com)
- A Discord bot token

## Quick start

```bash
git clone https://github.com/iritec/phone-local.git phone-local
cd phone-local
pnpm install
pnpm start
```

Then:

1. Open the settings window from the menu bar and add your Discord bot token and Ollama settings.
2. Invite the bot to your server or use DMs.
3. Start the bot from the app.

## Discord bot setup

PhoneLocal expects a standard Discord bot application with message content access and slash commands enabled.

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application and add a bot user.
3. Enable **Message Content Intent** in the bot settings.
4. Generate an OAuth URL with `bot` and `applications.commands`.
5. Invite the bot to your server.
6. Copy your user ID and place it in `ALLOWED_USER_IDS` for personal-only access.

The full step-by-step guide is in [docs/discord-bot-setup.md](docs/discord-bot-setup.md).

## Ollama setup

```bash
brew install ollama
ollama serve
ollama pull gemma4:26b
```

Any chat-capable local model works. Use a vision-capable model if you want image inputs.

## CLI mode

```bash
pnpm run cli
pnpm run typecheck
```

CLI mode is useful for headless runs or debugging without Electron.

## Commands

### Message commands

- `!reset` clears the current conversation history
- `!model <name>` switches the model for the current conversation
- `!help` prints inline usage

### Slash commands

- `/ai mode:on|off|status` enables or disables replies for the current channel
- `/think on|off|status` toggles thinking mode for the current user
- `/model` shows or changes the active Ollama model for the current conversation

## Configuration

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DISCORD_TOKEN` | Yes | — | Bot token from the Discord Developer Portal |
| `ALLOWED_USER_IDS` | No | empty | Comma-separated Discord user IDs allowed to use the bot |
| `ALLOWED_CHANNEL_IDS` | No | empty | Comma-separated channel IDs where the bot replies |
| `ALLOWED_GUILD_IDS` | No | empty | Comma-separated guild IDs used for slash command registration |
| `OLLAMA_HOST` | No | `http://127.0.0.1:11434` | Local Ollama endpoint |
| `OLLAMA_MODEL` | No | `gemma4:26b` | Default model name |
| `SYSTEM_PROMPT` | No | built-in | System prompt applied to each conversation |
| `HISTORY_TURNS` | No | `8` | Number of remembered turns |
| `LANG` | No | `en` | UI language for the app |

Most users can configure these values in the menu bar settings window. If you run CLI mode, you can also provide them through a local `.env` file.

## Local data

- `./logs/chat-YYYY-MM-DD.jsonl`: chat history and optional thinking traces
- `./data/ai-state.json`: per-channel AI enablement
- `./data/thinking.json`: user thinking preferences
- `~/Library/Application Support/phone-local/settings.json`: Electron app settings

## Build and release

Development build:

```bash
pnpm run dist:mac
```

Notarized production build:

```bash
CSC_NAME="Developer ID Application: Your Name (TEAM_ID)" \
APPLE_KEYCHAIN_PROFILE="notarytool" \
pnpm run dist:mac:prod
```

Artifacts are written to `release/`.

For a full signing and notarization reference, see the shared guide in `mypj/README.md`.

## GitHub release automation

This repository includes `.github/workflows/build.yml` for tag-based macOS builds.
Set these GitHub Actions secrets before using the workflow:

- `CERTIFICATE_P12_BASE64`
- `CERTIFICATE_PASSWORD`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`
- `APPLE_TEAM_ID`

Push a tag such as `v0.1.0` and the workflow will build signed macOS artifacts and upload them to GitHub Releases.

## Security notes

- Set `ALLOWED_USER_IDS` for personal use. Without it, anyone who can reach the bot can talk to it.
- `.env` stays local and is gitignored.
- This project is intended for self-hosted use and is not a hardened multi-tenant service.

## License

[MIT](LICENSE)
