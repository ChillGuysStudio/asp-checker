const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;

if (!BOT_TOKEN || !APP_ID) {
  console.error("Missing DISCORD_BOT_TOKEN or DISCORD_APPLICATION_ID in environment variables");
  process.exit(1);
}

const commands = [
  {
    name: 'set',
    description: 'Set the target URL for the ASP Checker to monitor every 30 minutes',
    options: [
      {
        type: 3, // STRING
        name: 'url',
        description: 'The URL to check (either the dates API or the booking request API)',
        required: true,
      }
    ]
  },
  {
    name: 'fetch',
    description: 'Force an immediate fetch of the target URL right now',
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
    description: 'View the current active URL and scraping status',
  }
];

async function registerCommands() {
  const response = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${BOT_TOKEN}`
    },
    body: JSON.stringify(commands)
  });

  if (response.ok) {
    console.log("Successfully registered global slash commands.");
  } else {
    console.error("Failed to register commands:", await response.text());
  }
}

registerCommands();
