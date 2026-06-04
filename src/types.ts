export interface Env {
  STATE: KVNamespace;
  DISCORD_BOT_TOKEN: string;
  DISCORD_USER_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_APPLICATION_ID: string;
}

export interface AppState {
  target_url: string | null;
  url_type: 'dates' | 'booking' | null;
  is_scraping: boolean;
  fetches_today: number;
  found_dates_today: boolean;
}
