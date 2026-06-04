# 🚗 ASP Checker

[🇬🇧 English](README.md) | [🇷🇴 Română](README.ro.md) | [🇷🇺 Русский](README.ru.md)

Un Cloudflare Worker serverless, ușor și rapid, creat pentru a automatiza verificarea portalului ASP (Agenția Servicii Publice) din Moldova pentru date disponibile la examenele auto sau pentru a verifica dacă cererea de programare a fost acceptată.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/MaxNoragami/asp-checker)

Rulează automat în fundal folosind Cloudflare Cron Triggers și te alertează direct prin mesaje private pe Discord.

## ✨ Funcționalități

- **Integrare Discord**: Complet controlabil prin Comenzi Slash pe Discord.
- **Detecție Inteligentă a URL-ului**: Detectează automat dacă ar trebui să caute date disponibile sau să monitorizeze dacă cererea ta de programare a avut succes.
- **Oprire Automată**: Dacă monitorizează o cerere de programare, se va opri automat în momentul în care detectează că programarea a fost efectuată cu succes.
- **Stateless & Serverless**: Utilizează Cloudflare KV pentru a păstra starea între rulări, asigurând zero downtime și menținând totul în nivelul gratuit (free tier).
- **Gestionare Globală a Erorilor**: Excepțiile netratate și erorile grave trimit un raport complet direct în mesajele tale private de pe Discord.

## 🤖 Comenzi Discord

- `/set [url]` - Setează URL-ul țintă pentru a fi verificat la fiecare 30 de minute. **Notă:** Ar trebui să setezi link-ul online al "cererii" care arată cam așa `https://eservicii.gov.md/asp/dimtcca/cerere/booking_code/some_id`. Bot-ul îl va converti automat în link-ul corect și ascuns al API-ului!
- `/fetch` - Forțează o verificare imediată.
- `/status` - Afișează URL-ul activ curent, starea de funcționare și numărul de verificări efectuate astăzi.
- `/toggle [True/False]` - Pornește sau oprește manual verificarea în fundal.

## 🛠 Tehnologii Folosite

- **Runtime**: [Bun](https://bun.com)
- **Deployment**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Stocare State**: Cloudflare KV
- **Limbaj**: TypeScript

## 👾 Configurare Bot Discord

Pentru a controla worker-ul și a primi mesaje, trebuie să creezi un simplu Bot pe Discord:

1. Accesează [Discord Developer Portal](https://discord.com/developers/applications).
2. Apasă pe **New Application** și numește-l "ASP Checker".
3. În secțiunea **Bot**, apasă pe **Reset Token** și copiază **Token**-ul. Acesta este `DISCORD_BOT_TOKEN`.
4. Mergi la secțiunea **General Information** și copiază **Application ID** și **Public Key**.
5. Adaugă bot-ul pe serverul tău:
   - Mergi la **OAuth2 > URL Generator**.
   - Bifează opțiunea `bot`.
   - Copiază URL-ul, deschide-l în browser și adaugă bot-ul pe serverul tău privat.
6. Află propriul tău ID de utilizator Discord:
   - În Discord, mergi la Settings > Advanced > Activează "Developer Mode".
   - Dă click dreapta pe poza ta de profil pe orice server și apasă **Copy User ID**. Acesta este `DISCORD_USER_ID`.

## 🚀 Configurare & Lansare

1. Instalează dependențele:
   ```bash
   bun install
   ```

2. Autentifică-te pe Cloudflare:
   ```bash
   bunx wrangler login
   ```

3. Creează spațiul KV:
   ```bash
   npx wrangler kv namespace create "STATE"
   ```
   *(Copiază `id`-ul generat în fișierul tău `wrangler.toml`)*

4. Adaugă secretele Discord în Worker-ul tău:
   ```bash
   npx wrangler secret put DISCORD_BOT_TOKEN
   npx wrangler secret put DISCORD_USER_ID
   npx wrangler secret put DISCORD_PUBLIC_KEY
   npx wrangler secret put DISCORD_APPLICATION_ID
   ```

5. Lansează (Deploy)!
   ```bash
   bunx wrangler deploy
   ```

## 🔌 Conectarea Comenzilor Slash Discord

După ce ai lansat worker-ul, trebuie să îi spui Discord-ului unde să trimită comenzile `/set` și `/fetch`.

1. Copiază URL-ul public pe care ți l-a oferit `wrangler deploy` (de ex., `https://asp-checker.<username>.workers.dev`).
2. Întoarce-te la [Discord Developer Portal](https://discord.com/developers/applications) > **General Information**.
3. Lipește URL-ul în câmpul **Interactions Endpoint URL** și salvează. Discord va trimite un ping pentru a-l verifica.
4. În final, înregistrează comenzile slash pentru botul tău rulând acest cod local:
   ```bash
   DISCORD_BOT_TOKEN="token-ul-tau" DISCORD_APPLICATION_ID="id-ul-tau" bun run register_commands.ts
   ```

*(Pentru lansare automată prin GitHub Actions, asigură-te că adaugi `CLOUDFLARE_API_TOKEN` și `CLOUDFLARE_ACCOUNT_ID` în secțiunea secrets a repository-ului).*
