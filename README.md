# 🚗 ASP Checker

[🇬🇧 English](README.md) | [🇷🇴 Română](README.ro.md) | [🇷🇺 Русский](README.ru.md)

A lightweight, serverless Cloudflare Worker built to automate scraping and checking the Moldovan ASP (Agentia Servicii Publice) portal for available driving exam dates or successful booking requests. 

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ChillGuysStudio/asp-checker)

It runs automatically in the background using Cloudflare Cron Triggers and alerts you directly via Discord DMs.

## ✨ Features

- **Discord Integration**: Fully controllable via Discord Slash Commands.
- **Smart URL Detection**: Automatically detects whether it should check for available dates or monitor if your booking request was successful.
- **Auto-Stop**: If monitoring a booking request, it will automatically stop scraping the moment it detects a successful appointment.
- **Stateless & Serverless**: Uses Cloudflare KV to keep track of state between runs, ensuring zero downtime and keeping it within the free tier.
- **Global Error Handling**: Unhandled exceptions and crashes send a stack trace directly to your Discord DMs.

## 🤖 Discord Commands

- `/set [url]` - Sets the target URL to monitor every 30 minutes. **Note:** You should set the URL to the online "cerere" link that looks something like `https://eservicii.gov.md/asp/dimtcca/cerere/booking_code/some_id`. The bot will automatically convert it to the correct hidden API endpoint!
- `/fetch` - Forces an immediate check right now.
- `/status` - Displays the current active URL, running status, and today's fetch count.
- `/toggle [True/False]` - Manually turn the background scraper on or off.

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.com)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **State Management**: Cloudflare KV
- **Language**: TypeScript

## 👾 Discord Bot Setup

To control the worker and receive DMs, you need to create a simple Discord Bot:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Click **New Application** and name it "ASP Checker".
3. Under the **Bot** tab, click **Reset Token** and copy the **Token**. This is your `DISCORD_BOT_TOKEN`.
4. Go to the **General Information** tab and copy your **Application ID** and **Public Key**.
5. Add the bot to your server:
   - Go to **OAuth2 > URL Generator**.
   - Check the `bot` scope.
   - Copy the URL, open it in your browser, and add the bot to your private server.
6. Find your own Discord User ID:
   - In Discord, go to Settings > Advanced > Enable "Developer Mode".
   - Right-click your profile picture in any server and click **Copy User ID**. This is your `DISCORD_USER_ID`.

## 🚀 Setup & Deployment

*(Note: Bun is recommended, but you can use `npm` instead of `bun`, and `npx` instead of `bunx` for all commands below if you prefer)*

1. Install dependencies:
   ```bash
   bun install
   ```

2. Authenticate with Cloudflare:
   ```bash
   bunx wrangler login
   ```

3. Create the KV Namespace:
   ```bash
   bunx wrangler kv namespace create "STATE"
   ```
   *(Copy the generated `id` into your `wrangler.toml`)*

4. Add Discord Secrets to your Worker:
   ```bash
   bunx wrangler secret put DISCORD_BOT_TOKEN
   bunx wrangler secret put DISCORD_USER_ID
   bunx wrangler secret put DISCORD_PUBLIC_KEY
   bunx wrangler secret put DISCORD_APPLICATION_ID
   ```

5. Deploy!
   ```bash
   bunx wrangler deploy
   ```

## 🔌 Connecting Discord Slash Commands

After deploying your worker, you need to tell Discord where to send the `/set` and `/fetch` commands.

1. Copy the public URL that `wrangler deploy` gave you (e.g., `https://asp-checker.<username>.workers.dev`).
2. Go back to the [Discord Developer Portal](https://discord.com/developers/applications) > **General Information**.
3. Paste the URL into the **Interactions Endpoint URL** field and save. Discord will send a ping to verify it.
4. Finally, register the slash commands to your bot by running this locally:
   ```bash
   DISCORD_BOT_TOKEN="your-bot-token" DISCORD_APPLICATION_ID="your-app-id" bun run register_commands.ts
   ```

*(For automatic GitHub Actions deployment, ensure you add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to your repository secrets).*

---
*Disclaimer: This project has been built using Gemini 3.1 Pro (AI tools).*
