# 🚗 ASP Checker

A lightweight, serverless Cloudflare Worker built to automate scraping and checking the Moldovan ASP (Agentia Servicii Publice) portal for available driving exam dates or successful booking requests. 

It runs automatically in the background using Cloudflare Cron Triggers and alerts you directly via Discord DMs.

## ✨ Features

- **Discord Integration**: Fully controllable via Discord Slash Commands.
- **Smart URL Detection**: Automatically detects whether it should check for available dates or monitor if your booking request was successful.
- **Auto-Stop**: If monitoring a booking request, it will automatically stop scraping the moment it detects a successful appointment.
- **Stateless & Serverless**: Uses Cloudflare KV to keep track of state between runs, ensuring zero downtime and keeping it within the free tier.
- **Global Error Handling**: Unhandled exceptions and crashes send a stack trace directly to your Discord DMs.

## 🤖 Discord Commands

- `/set [url]` - Sets the target URL to monitor every 30 minutes. 
- `/fetch` - Forces an immediate check right now.
- `/status` - Displays the current active URL, running status, and today's fetch count.
- `/toggle [True/False]` - Manually turn the background scraper on or off.

## 🛠 Tech Stack

- **Runtime**: [Bun](https://bun.com)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **State Management**: Cloudflare KV
- **Language**: TypeScript

## 🚀 Setup & Deployment

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
   npx wrangler kv namespace create "STATE"
   ```
   *(Copy the generated `id` into your `wrangler.toml`)*

4. Add Discord Secrets to your Worker:
   ```bash
   npx wrangler secret put DISCORD_BOT_TOKEN
   npx wrangler secret put DISCORD_USER_ID
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_APPLICATION_ID
   ```

5. Deploy!
   ```bash
   bunx wrangler deploy
   ```

*(For automatic GitHub Actions deployment, ensure you add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to your repository secrets).*
