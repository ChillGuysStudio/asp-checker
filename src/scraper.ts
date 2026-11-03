import type { Env, AppState } from './types';
import { sendDiscordDM } from './discord';

export async function performScrape(env: Env, state: AppState, isManual: boolean = false): Promise<AppState> {
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
        const data: any = JSON.parse(text);

        // 1. Check if an appointment was successfully booked
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
          return state;
        }

        // 2. Query available dates for this booking request from the QMatic API
        const publicServiceId = data.serviceRequest?.publicServiceId;
        const publicLocationId = data.serviceRequest?.examinationLocation?.publicId || data.serviceRequest?.examinationLocation?.id;
        const idnp = data.idnp || data.requestor?.requestorIdnp;
        const seriaAndNumber = data.serviceRequest?.seriaAndNumber;
        const issueDate = data.serviceRequest?.issueDate;

        if (publicServiceId && publicLocationId && idnp) {
          const datesRes = await fetch('https://eservicii.gov.md/asp/dimtcca/api/qmatic/dates', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: JSON.stringify({
              publicServiceId,
              publicLocationId,
              idnp,
              seriaAndNumber,
              issueDate
            })
          });

          if (datesRes.ok) {
            const dates: any = await datesRes.json();
            if (Array.isArray(dates) && dates.length > 0) {
              state.found_dates_today = true;
              const datesKey = dates.map((d: any) => `${d.date}:${d.timeSlots ?? 0}`).join(',');

              // Alert on manual fetch OR when the available dates changed since last notification
              if (isManual || state.last_notified_dates !== datesKey) {
                state.last_notified_dates = datesKey;

                let dateLines = dates
                  .slice(0, 20)
                  .map((d: any) => `- 📅 **${d.date}**${d.timeSlots != null ? ` (${d.timeSlots} slots)` : ''}`)
                  .join('\n');

                if (dates.length > 20) {
                  dateLines += `\n... and ${dates.length - 20} more dates`;
                }

                const portalUrl = `https://eservicii.gov.md/asp/dimtcca/cerere/${data.type?.code || 'APO01'}/${data.id}`;

                await sendDiscordDM(
                  env,
                  `🚨 **DATES AVAILABLE!** 🚨\nFound **${dates.length}** open date(s) on the ASP portal:\n${dateLines}\n\n👉 [Open Application on ASP Portal](<${portalUrl}>)`
                );
              }
            } else {
              state.last_notified_dates = null;
              if (isManual) {
                await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found at this moment.`);
              }
            }
          } else {
            console.error(`Failed to fetch dates: ${datesRes.status}`);
            if (isManual) {
              await sendDiscordDM(env, `⚠️ Could not query calendar dates (API status ${datesRes.status}).`);
            }
          }
        } else if (isManual) {
          await sendDiscordDM(env, `⚠️ Could not extract required service/location IDs from application.`);
        }

      } catch (e) {
        console.error("Failed to parse booking JSON", e);
      }
    } else if (state.url_type === 'dates') {
      try {
        const data = JSON.parse(text);
        // Valid dates are returned as an array with items. If it's an empty array [], it means no dates.
        if (Array.isArray(data) && data.length > 0) {
          state.found_dates_today = true;
          const datesKey = JSON.stringify(data);

          if (isManual || state.last_notified_dates !== datesKey) {
            state.last_notified_dates = datesKey;
            let dateLines = data
              .slice(0, 20)
              .map((d: any) => `- 📅 **${d.date || d}**${d.timeSlots != null ? ` (${d.timeSlots} slots)` : ''}`)
              .join('\n');

            if (data.length > 20) {
              dateLines += `\n... and ${data.length - 20} more dates`;
            }

            await sendDiscordDM(env, `🚨 **DATES AVAILABLE!** 🚨\nCheck the ASP portal now! I found dates:\n${dateLines}`);
          }
        } else {
          state.last_notified_dates = null;
          if (isManual) {
            await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found at this moment.`);
          }
        }
      } catch (e) {
        console.error("Failed to parse dates JSON. It might be an HTML error page or the wrong URL.");
        if (isManual) {
          await sendDiscordDM(env, `⚠️ **ASP Checker**: Could not parse response as dates. Make sure you set a \`/cerere/...\` link.`);
        }
      }
    }

  } catch (error: any) {
    console.error("Error fetching URL:", error);
    await sendDiscordDM(env, `⚠️ **Network Error!** Failed to fetch the URL.\n\`${error.message}\`\nScraping has been automatically paused.`);
    state.is_scraping = false;
  }

  return state;
}