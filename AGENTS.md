# Agent instructions

## Sensitive data

This repo is public. An application ID is a bearer secret: `GET /asp/dimtcca/api/fod/request/<code>/<id>` returns the applicant's name, IDNP, phone and document number with no login.

- Write placeholders everywhere that is committed or pushed (code, tests, docs, commit messages, PRs): `booking_code`, `some_id`, `<user>.workers.dev`.
- Keep portal responses in a scratch directory outside the repo, print field names rather than values, and delete them when finished.
- Mask IDs when printing live state: `bunx wrangler kv key get daily_stats --binding STATE --remote | sed -E 's#(request/[^/]+/)[^"]*#\1<id>#'`
- Load secrets from `.env` without echoing them.

Before every push, run this from the repo root and expect no output beyond a co-author trailer:

```bash
(git diff origin/main; git log origin/main.. --format=%B) | grep -nE '[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}|\b[0-9]{13}\b|\b[0-9]{17,20}\b|\b[A-Z][0-9]{8}\b|[a-z0-9-]+\.workers\.dev|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]+|[A-Za-z0-9_-]{23,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}' | grep -v '<user>'
```

## Runbook: slash commands reply, but no DM arrives

Slash replies travel in the interaction's HTTP response and never use the bot token. DMs use `DISCORD_BOT_TOKEN` and `DISCORD_USER_ID`. So working commands say nothing about whether DMs work, and the scrape is usually fine.

1. **Scrape or delivery?** Read live state (masked command above) after a `/fetch`. `fetches_today` rising means the portal fetch worked. In `edit` mode, a date that stays available while `last_notified_dates` is `null` was found but not delivered. `dates` and `booking` modes cache before sending, so a filled cache there proves nothing.
2. **Get Discord's error.** Run `bunx wrangler tail asp-checker --format json` across a `/fetch` or a cron tick, and find the `Discord DM ... failed` log line. Done when you have the status code, or a run that sent a DM without that line.
3. **Act on the status:**

   | Log line | Cause | Fix |
   |---|---|---|
   | `401` | Worker holds a token that was reset in the Developer Portal | Replace the secret (step 4) |
   | `is missing` | Secret not set | `bunx wrangler secret list`, then set the missing one |
   | `channel failed: 400`/`404` | Wrong `DISCORD_USER_ID` | Ask the user for their ID, set the secret |
   | `message failed: 403` | User blocks DMs or shares no server with the bot | User changes Discord privacy settings or re-adds the bot |
   | `429` | Rate limited | Wait; `edit` mode retries on the next cron tick |

4. **Replace the token**, after the user agrees, since it overwrites a live credential. First expect `200` from the local one:

   ```bash
   bash -c 'set -a; . ./.env; curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bot $DISCORD_BOT_TOKEN" https://discord.com/api/v10/users/@me'
   bash -c 'set -a; . ./.env; printf %s "$DISCORD_BOT_TOKEN" | bunx wrangler secret put DISCORD_BOT_TOKEN'
   ```

   On `401` locally, the user must put a fresh token in `.env` first. The secret takes effect without a redeploy.
5. **Confirm delivery.** Done when the user sees the DM, or, in `edit` mode, when an available date enters `last_notified_dates`. Stubbed-Discord tests cannot show a bad live secret.

`bunx wrangler deployments list` tells you whether a secret was really replaced: look for `Source: Secret Change`.

## Deploying

- Pushing to `main` does not deploy this repo (the workflow runs only on forks). Run `bunx wrangler deploy`, and keep what is live in `main`.
- Deploying does not update Discord's command list. After changing `register_commands.ts`, run `bun run register_commands.ts`; set `DISCORD_GUILD_ID` only if commands were registered to that guild before, otherwise they appear twice.
- `/clear` resets cached dates; it cannot fix delivery.
