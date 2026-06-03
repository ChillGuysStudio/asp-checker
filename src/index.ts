export interface Env {
  STATE: KVNamespace;
  DISCORD_BOT_TOKEN: string;
  DISCORD_USER_ID: string;
}

const API_URL = "https://eservicii.gov.md/asp/dimtcca/api/qmatic/dates/f4bac1a2f8d6e023084cfe8fd845a0ae68c776c6ab138622b5d864f59408b0b8/9c93477f3ac5814a4c29f35b35089992704c8b0fb90ac3da9651f39515265370";

async function sendDiscordDM(env: Env, content: string) {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_USER_ID) {
    console.error("Missing Discord credentials in environment variables.");
    return;
  }

  // 1. Create/Get DM channel with the user
  const channelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipient_id: env.DISCORD_USER_ID })
  });

  if (!channelRes.ok) {
    console.error("Failed to create DM channel:", await channelRes.text());
    return;
  }

  const channelData: any = await channelRes.json();
  const channelId = channelData.id;

  // 2. Send the message to the DM channel
  const messageRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });
  
  if (!messageRes.ok) {
    console.error("Failed to send message:", await messageRes.text());
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Get current time in Chisinau
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Chisinau',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    
    // formatter.format(now) returns something like "24:30" or "05:00" wait actually 24-hour format returns "5:00" or "23:00"
    const parts = formatter.formatToParts(now);
    let chisinauHour = 0;
    let chisinauMinute = 0;
    for (const part of parts) {
      if (part.type === 'hour') chisinauHour = parseInt(part.value, 10);
      if (part.type === 'minute') chisinauMinute = parseInt(part.value, 10);
    }
    
    // In some Intl implementations, 24-hour hour can be 24 instead of 0.
    if (chisinauHour === 24) chisinauHour = 0;

    // Check if we are between 5 AM and 11 PM (23:00)
    // The cron runs every 30 minutes. We want it to run from 05:00 up to 23:00.
    if (chisinauHour < 5 || chisinauHour > 23) {
      console.log(`Current Chisinau time is ${chisinauHour}:${chisinauMinute}. Outside of working hours (5-23). Skipping.`);
      return;
    }
    
    // If it's 23:30, we skip (we only want up to 23:00)
    if (chisinauHour === 23 && chisinauMinute > 15) {
      console.log(`Current Chisinau time is 23:${chisinauMinute}. Skipping 23:30 run.`);
      return;
    }

    // Read KV state
    let state = { fetches: 0, foundDates: false };
    const storedState = await env.STATE.get('daily_stats', 'json');
    if (storedState) {
      state = storedState as { fetches: number, foundDates: boolean };
    }

    let foundDatesThisRun = false;
    let errorFetching = false;
    
    try {
      // Fetch dates
      const res = await fetch(API_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      
      if (!res.ok) {
        console.error(`API returned status ${res.status}`);
        errorFetching = true;
      } else {
        const text = await res.text();
        state.fetches++;
        
        // Response is usually `[]` if no dates
        if (text.trim() !== '[]' && text.trim() !== '') {
          foundDatesThisRun = true;
          state.foundDates = true;
          
          await sendDiscordDM(env, `🚨 **DATES AVAILABLE!** 🚨\nCheck the ASP portal now! I found something: \`\`\`json\n${text.substring(0, 500)}\n\`\`\``);
        } else {
          console.log("No dates found. Response was []");
        }
      }
    } catch (error) {
      console.error("Error fetching dates:", error);
      errorFetching = true;
    }

    // Save updated state
    await env.STATE.put('daily_stats', JSON.stringify(state));

    // If it's exactly 11 PM (23:00 run, minute < 15), send the daily report and reset state
    if (chisinauHour === 23 && chisinauMinute < 15) {
      const reportMessage = `📊 **Daily Report (ASP Checker)** 📊\n` +
                            `- Fetches performed today: **${state.fetches}**\n` +
                            `- Were any dates found today? **${state.foundDates ? 'YES 🚨' : 'No 😴'}**`;
      
      await sendDiscordDM(env, reportMessage);
      
      // Reset state for tomorrow
      await env.STATE.put('daily_stats', JSON.stringify({ fetches: 0, foundDates: false }));
    }
  },
};
