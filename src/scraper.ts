import { Env, AppState } from './types';
import { sendDiscordDM } from './discord';

export async function performScrape(env: Env, state: AppState): Promise<AppState> {
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
