import type { Env, AppState } from './types';
import { sendDiscordDM } from './discord';

export const MONTH_NAMES: Record<string, string> = {
  '01': 'January',
  '02': 'February',
  '03': 'March',
  '04': 'April',
  '05': 'May',
  '06': 'June',
  '07': 'July',
  '08': 'August',
  '09': 'September',
  '10': 'October',
  '11': 'November',
  '12': 'December',
};

function filterDatesByMonth(datesList: any[], month: string | null): any[] {
  if (!month || month === 'all') return datesList;
  return datesList.filter((d: any) => {
    const dateStr = d.date || d;
    if (typeof dateStr !== 'string') return false;
    const parts = dateStr.split('-');
    const m = parts[1];
    if (!m) return false;
    return m === month || parseInt(m, 10) === parseInt(month, 10);
  });
}

export async function performScrape(
  env: Env,
  state: AppState,
  isManual: boolean = false,
  monthOverride?: string | null
): Promise<AppState> {
  if (!state.target_url) {
    return state;
  }

  const targetMonth = monthOverride !== undefined ? monthOverride : (state.target_month || null);
  const monthLabel = targetMonth ? (MONTH_NAMES[targetMonth] || `Month ${targetMonth}`) : null;

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
            const allDates: any = await datesRes.json();
            const dates = Array.isArray(allDates) ? allDates : [];
            const filteredDates = filterDatesByMonth(dates, targetMonth);

            if (filteredDates.length > 0) {
              state.found_dates_today = true;
              const datesKey = `${targetMonth || 'all'}:${filteredDates.map((d: any) => `${d.date}:${d.timeSlots ?? 0}`).join(',')}`;

              // Alert on manual fetch OR when the filtered dates changed since last notification
              if (isManual || state.last_notified_dates !== datesKey) {
                state.last_notified_dates = datesKey;

                let dateLines = filteredDates
                  .slice(0, 20)
                  .map((d: any) => `- 📅 **${d.date}**${d.timeSlots != null ? ` (${d.timeSlots} slots)` : ''}`)
                  .join('\n');

                if (filteredDates.length > 20) {
                  dateLines += `\n... and ${filteredDates.length - 20} more dates`;
                }

                const portalUrl = `https://eservicii.gov.md/asp/dimtcca/cerere/${data.type?.code || 'APO01'}/${data.id}`;
                const header = monthLabel
                  ? `🚨 **DATES AVAILABLE (${monthLabel})!** 🚨\nFound **${filteredDates.length}** open date(s) in **${monthLabel}** on the ASP portal:`
                  : `🚨 **DATES AVAILABLE!** 🚨\nFound **${filteredDates.length}** open date(s) on the ASP portal:`;

                await sendDiscordDM(
                  env,
                  `${header}\n${dateLines}\n\n👉 [Open Application on ASP Portal](<${portalUrl}>)`
                );
              }
            } else {
              state.last_notified_dates = null;
              if (isManual) {
                if (monthLabel) {
                  const extraNote = dates.length > 0
                    ? `\n*(Note: Found ${dates.length} date(s) in other months, but none in ${monthLabel})*`
                    : '';
                  await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found for **${monthLabel}** at this moment.${extraNote}`);
                } else {
                  await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found at this moment.`);
                }
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
        const dates = Array.isArray(data) ? data : [];
        const filteredDates = filterDatesByMonth(dates, targetMonth);

        if (filteredDates.length > 0) {
          state.found_dates_today = true;
          const datesKey = `${targetMonth || 'all'}:${JSON.stringify(filteredDates)}`;

          if (isManual || state.last_notified_dates !== datesKey) {
            state.last_notified_dates = datesKey;
            let dateLines = filteredDates
              .slice(0, 20)
              .map((d: any) => `- 📅 **${d.date || d}**${d.timeSlots != null ? ` (${d.timeSlots} slots)` : ''}`)
              .join('\n');

            if (filteredDates.length > 20) {
              dateLines += `\n... and ${filteredDates.length - 20} more dates`;
            }

            const header = monthLabel
              ? `🚨 **DATES AVAILABLE (${monthLabel})!** 🚨\nCheck the ASP portal now! Found dates in **${monthLabel}**:`
              : `🚨 **DATES AVAILABLE!** 🚨\nCheck the ASP portal now! I found dates:`;

            await sendDiscordDM(env, `${header}\n${dateLines}`);
          }
        } else {
          state.last_notified_dates = null;
          if (isManual) {
            if (monthLabel) {
              const extraNote = dates.length > 0
                ? `\n*(Note: Found ${dates.length} date(s) in other months, but none in ${monthLabel})*`
                : '';
              await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found for **${monthLabel}** at this moment.${extraNote}`);
            } else {
              await sendDiscordDM(env, `ℹ️ **ASP Checker**: No available dates found at this moment.`);
            }
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
