# Discord Bot Setup

This guide walks through the exact Discord setup needed for PhoneLocal.

## 1. Create the application

1. Open the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application**.
3. Enter a name such as `PhoneLocal`.
4. Open the application you just created.

## 2. Add a bot user

1. Open the **Bot** tab.
2. Click **Add Bot**.
3. Keep **Public Bot** disabled if this is for personal use.
4. Under **Privileged Gateway Intents**, enable **Message Content Intent**.

PhoneLocal reads message text in DMs and allowed channels, so this intent is required.

## 3. Copy the bot token

1. In the **Bot** tab, click **Reset Token** or **Copy**.
2. Store the token securely.
3. Put it into `DISCORD_TOKEN` in `.env` or the settings window.

Never commit the token.

## 4. Generate the invite URL

1. Open **OAuth2**.
2. Go to **URL Generator**.
3. Under **Scopes**, enable:
   - `bot`
   - `applications.commands`
4. Under **Bot Permissions**, enable at least:
   - `View Channels`
   - `Send Messages`
   - `Read Message History`
   - `Create Public Threads`
   - `Send Messages in Threads`
   - `Attach Files`
   - `Embed Links`

If you only use the bot in DMs, the server permissions matter less, but the list above is the safe baseline for guild usage.

## 5. Invite the bot

1. Open the generated OAuth URL.
2. Choose the server where you want to use the bot.
3. Authorize the application.

If slash commands do not appear later, re-open the OAuth URL and confirm the `applications.commands` scope is included.

## 6. Restrict access

PhoneLocal is intended to run as a personal or tightly scoped bot.

To keep access limited:

1. In Discord, open **Settings**.
2. Open **Advanced**.
3. Enable **Developer Mode**.
4. Right-click your user profile and copy your user ID.
5. Put that value into `ALLOWED_USER_IDS`.

Optional restrictions:

- `ALLOWED_CHANNEL_IDS`: limit replies to specific channels
- `ALLOWED_GUILD_IDS`: limit slash command registration to specific servers

## 7. First successful test

1. Start Ollama locally.
2. Launch PhoneLocal.
3. Save your token, Ollama host, and model in the settings window.
4. Start the bot.
5. Send a DM to the bot or post in an allowed channel.

Useful checks:

- `/model` verifies slash command registration
- `/think on` enables thinking traces in local logs
- `!help` returns the inline usage message

## Troubleshooting

### The bot joins but does not answer

- Confirm `DISCORD_TOKEN` is correct
- Confirm **Message Content Intent** is enabled
- Confirm `ALLOWED_USER_IDS` or `ALLOWED_CHANNEL_IDS` are not blocking you
- Confirm Ollama is running at the configured host

### Slash commands do not appear

- Re-invite the bot with the `applications.commands` scope
- Set `ALLOWED_GUILD_IDS` if you want command registration scoped to selected guilds
- Restart the bot after changing guild restrictions

### Thread creation fails

PhoneLocal creates threads for channel conversations.
Grant these permissions in the server:

- `Create Public Threads`
- `Send Messages in Threads`

### Images are ignored

Use a vision-capable model such as `gemma3` or another Ollama model that supports image inputs.
