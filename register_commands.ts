const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!BOT_TOKEN || !APP_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID in environment variables");
  process.exit(1);
}

const MONTH_CHOICES = [
  { name: 'All Months', value: 'all' },
  { name: 'January', value: '01' },
  { name: 'February', value: '02' },
  { name: 'March', value: '03' },
  { name: 'April', value: '04' },
  { name: 'May', value: '05' },
  { name: 'June', value: '06' },
  { name: 'July', value: '07' },
  { name: 'August', value: '08' },
  { name: 'September', value: '09' },
  { name: 'October', value: '10' },
  { name: 'November', value: '11' },
  { name: 'December', value: '12' },
];

const commands = [
  {
    name: 'set',
    description: 'Set target URL and optional month filter to monitor every 30 minutes',
    options: [
      {
        type: 3, // STRING
        name: 'url',
        description: 'The URL to check (either the dates API or the booking request API)',
        required: true,
      },
      {
        type: 3, // STRING
        name: 'month',
        description: 'Filter dates by month (defaults to All Months)',
        required: false,
        choices: MONTH_CHOICES
      }
    ]
  },
  {
    name: 'fetch',
    description: 'Force an immediate fetch right now (with optional month filter)',
    options: [
      {
        type: 3, // STRING
        name: 'month',
        description: 'Filter dates by month for this fetch (optional)',
        required: false,
        choices: MONTH_CHOICES
      }
    ]
  },
  {
    name: 'month',
    description: 'Update the monitored month filter for background checks',
    options: [
      {
        type: 3, // STRING
        name: 'month',
        description: 'The month to filter for (or All Months)',
        required: true,
        choices: MONTH_CHOICES
      }
    ]
  },
  {
    name: 'toggle',
    description: 'Manually start or stop the background scraping',
    options: [
      {
        type: 5, // BOOLEAN
        name: 'status',
        description: 'True to start scraping, False to stop',
        required: true,
      }
    ]
  },
  {
    name: 'status',
    description: 'View the current active URL, month filter, and scraping status',
  }
];

async function registerCommands() {
  const endpoint = GUILD_ID
    ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
    : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: JSON.stringify(commands)
  });

  if (response.ok) {
    if (GUILD_ID) {
      console.log(`Successfully registered guild slash commands (instant update for guild ${GUILD_ID}).`);
    } else {
      console.log("Successfully registered global slash commands (may take up to 1 hour to propagate).");
    }
  } else {
    console.error("Failed to register commands:", await response.text());
  }
}

registerCommands();
