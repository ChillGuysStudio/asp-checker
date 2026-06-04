import { verifyKey, InteractionType, InteractionResponseType } from 'discord-interactions';

export interface Env {
  STATE: KVNamespace;
  DISCORD_BOT_TOKEN: string;
  DISCORD_USER_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
}

interface AppState {
  target_url: string | null;
  url_type: 'dates' | 'booking' | null;
  is_scraping: boolean;
  fetches_today: number;
  found_dates_today: boolean;
}

// Helper to send a DM
async function sendDiscordDM(env: Env, content: string) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_USER_ID) return;

  const channelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipient_id: env.DISCORD_USER_ID })
  });

  if (!channelRes.ok) return;
  const channelData: any = await channelRes.json();
  const channelId = channelData.id;

  await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
}

// Reusable logic for fetching the target URL
async function performScrape(env: Env, state: AppState): Promise<AppState> {
  if (!state.target_url) {
    return state;
  }

  try {
    const res = await fetch(state.target_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      console.error(`API returned status ${res.status}`);
      await sendDiscordDM(env, `⚠️ The scraper received a **${res.status}** error.\nScraping has been automatically paused. Please check your URL using \`/status\` or set a new one.`);
      state.is_scraping = false;
      return state;
    }

    const text = await res.text();
    state.fetches_today++;

    if (state.url_type === 'booking') {
      try {
        const data = JSON.parse(text);
        if (data.hasAppointment === true) {
          let dateStr = "Unknown Date";
          if (data.serviceRequest?.examinationDate) {
            const datePart = data.serviceRequest.examinationDate.split('T')[0];
            const timePart = data.serviceRequest.examinationTime?.time || "";
            dateStr = `${datePart} ${timePart}`.trim();
          } else if (data.appointment?.date) {
            dateStr = data.appointment.date;
          }
          
          await sendDiscordDM(env, `✅ **SUCCESSFUL BOOKING DETECTED!** ✅\nDate: ${dateStr}\nStopping the scraper now.`);
          state.is_scraping = false; // Stop scraping
        }
      } catch (e) {
        console.error("Failed to parse booking JSON");
      }
    } else if (state.url_type === 'dates') {
      try {
        const data = JSON.parse(text);
        // Valid dates are returned as an array with items. If it's an empty array [], it means no dates.
        if (Array.isArray(data) && data.length > 0) {
          state.found_dates_today = true;
          await sendDiscordDM(env, `🚨 **DATES AVAILABLE!** 🚨\nCheck the ASP portal now! I found something: \`\`\`json\n${JSON.stringify(data).substring(0, 500)}\n\`\`\``);
        }
      } catch (e) {
        console.error("Failed to parse dates JSON. It might be an HTML error page or the wrong URL.");
        // Do not trigger a false alarm!
      }
    }

  } catch (error: any) {
    console.error("Error fetching URL:", error);
    await sendDiscordDM(env, `⚠️ **Network Error!** Failed to fetch the URL.\n\`${error.message}\`\nScraping has been automatically paused.`);
    state.is_scraping = false;
  }

  return state;
}

export default {
  // 1. HTTP Endpoint for Discord Slash Commands
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
      }

      const signature = request.headers.get('x-signature-ed25519');
      const timestamp = request.headers.get('x-signature-timestamp');
      const body = await request.clone().text();

      if (!signature || !timestamp || !env.DISCORD_PUBLIC_KEY) {
        return new Response('Bad request signature', { status: 401 });
      }

      const isValidRequest = await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY);
      if (!isValidRequest) {
        return new Response('Bad request signature', { status: 401 });
      }

      const interaction = JSON.parse(body);

      // Respond to Discord verification ping
      if (interaction.type === InteractionType.PING) {
        return new Response(JSON.stringify({ type: InteractionResponseType.PONG }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Handle Slash Commands
      if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        const command = interaction.data.name;
        let savedState: any = await env.STATE.get('daily_stats', 'json');
        let state: AppState = {
          target_url: savedState?.target_url || null,
          url_type: savedState?.url_type || null,
          is_scraping: savedState?.is_scraping ?? true,
          fetches_today: savedState?.fetches_today ?? 0,
          found_dates_today: savedState?.found_dates_today ?? false
        };

        let replyMessage = "Command executed.";

        if (command === 'set') {
          const urlOption = interaction.data.options.find((o: any) => o.name === 'url');
          if (urlOption) {
            let url = urlOption.value;
            
            if (!url.includes('eservicii.gov.md')) {
              replyMessage = `❌ **Invalid URL!** The URL must belong to \`eservicii.gov.md\`. Scraping was not updated.`;
            } else {
              // Re-enable scraping when a new URL is set
              state.is_scraping = true;
              
              // Auto-convert frontend booking URL to the API booking URL
              if (url.includes('/cerere/')) {
                url = url.replace('/cerere/', '/api/fod/request/');
                state.target_url = url;
                state.url_type = 'booking';
                replyMessage = `✅ I noticed you pasted the frontend URL! I've automatically converted it to the **Booking API**:\n<${url}>\nI will stop scraping when an appointment is found.`;
              } else if (url.includes('/api/fod/request/')) {
              state.target_url = url;
              state.url_type = 'booking';
              replyMessage = `✅ Target URL set. Type detected: **Booking Check**. I will stop scraping when an appointment is found.`;
            } else if (url.includes('/api/qmatic/dates/')) {
              state.target_url = url;
              state.url_type = 'dates';
              replyMessage = `✅ Target URL set. Type detected: **Available Dates**. I will notify you when dates appear.`;
            } else {
              state.target_url = url;
              state.url_type = 'dates'; // Fallback
              replyMessage = `⚠️ Target URL set, but type couldn't be automatically detected. Defaulting to 'dates'.`;
            }
          }
          }
        } 
        else if (command === 'toggle') {
          const statusOption = interaction.data.options.find((o: any) => o.name === 'status');
          if (statusOption) {
            state.is_scraping = statusOption.value;
            replyMessage = `Scraping is now **${state.is_scraping ? 'ON' : 'OFF'}**.`;
          }
        }
        else if (command === 'status') {
          replyMessage = `📊 **ASP Checker Status** 📊\n` +
                         `- Running: **${state.is_scraping ? 'YES' : 'NO'}**\n` +
                         `- Target URL: ${state.target_url ? `\n<${state.target_url}>` : 'None'}\n` +
                         `- URL Type: **${state.url_type}**\n` +
                         `- Fetches today: **${state.fetches_today}**`;
        }
        else if (command === 'fetch') {
          if (!state.target_url) {
            replyMessage = "❌ No target URL set. Use `/set` first.";
          } else {
            // Because Discord requires a response within 3 seconds, we use `ctx.waitUntil` for the heavy work.
            ctx.waitUntil(
              performScrape(env, state).then(async (newState) => {
                await env.STATE.put('daily_stats', JSON.stringify(newState));
              })
            );
            replyMessage = "Fetching right now in the background! You will receive a DM if anything is found.";
          }
        }

        // Save state changes only if a modifying command was called
        if (command === 'set' || command === 'toggle') {
          await env.STATE.put('daily_stats', JSON.stringify(state));
        }

        return new Response(JSON.stringify({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: replyMessage }
        }), { headers: { 'Content-Type': 'application/json' } });
      }

      return new Response('Unknown command', { status: 400 });

    } catch (error: any) {
      console.error("Fetch Error:", error);
      await sendDiscordDM(env, `💥 **CRASH REPORT (HTTP)** 💥\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
      return new Response('Internal Server Error', { status: 500 });
    }
  },

  // 2. Cron Execution
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      let savedState: any = await env.STATE.get('daily_stats', 'json');
      let state: AppState = {
        target_url: savedState?.target_url || null,
        url_type: savedState?.url_type || null,
        is_scraping: savedState?.is_scraping ?? true,
        fetches_today: savedState?.fetches_today ?? 0,
        found_dates_today: savedState?.found_dates_today ?? false
      };

      if (!state.is_scraping || !state.target_url) {
        return;
      }

      state = await performScrape(env, state);
      await env.STATE.put('daily_stats', JSON.stringify(state));

    } catch (error: any) {
      console.error("Scheduled Error:", error);
      await sendDiscordDM(env, `💥 **CRASH REPORT (CRON)** 💥\n\`\`\`\n${error.stack || error.message}\n\`\`\``);
    }
  },
};
