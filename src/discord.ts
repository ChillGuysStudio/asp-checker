import type { Env } from './types';

export async function sendDiscordDM(env: Env, content: string) {
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
