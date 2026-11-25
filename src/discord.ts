import type { Env } from './types';

/** Returns whether Discord accepted the message, so callers can avoid marking a lost alert as sent. */
export async function sendDiscordDM(env: Env, content: string): Promise<boolean> {
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_USER_ID) {
    console.error('Discord DM not sent: DISCORD_BOT_TOKEN or DISCORD_USER_ID is missing');
    return false;
  }

  const channelRes = await fetch('https://discord.com/api/v10/users/@me/channels', {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ recipient_id: env.DISCORD_USER_ID })
  });

  if (!channelRes.ok) {
    console.error(`Discord DM channel failed: ${channelRes.status} ${await channelRes.text()}`);
    return false;
  }
  const channelData: any = await channelRes.json();
  const channelId = channelData.id;

  const messageRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content })
  });

  if (!messageRes.ok) {
    console.error(`Discord DM message failed: ${messageRes.status} ${await messageRes.text()}`);
  }
  return messageRes.ok;
}
