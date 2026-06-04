# 🚗 ASP Checker

[🇬🇧 English](README.md) | [🇷🇴 Română](README.ro.md) | [🇷🇺 Русский](README.ru.md)

Легкий бессерверный скрипт Cloudflare Worker, созданный для автоматической проверки портала ASP Молдовы (Агентство Государственных Услуг) на наличие свободных дат экзаменов по вождению или для отслеживания успешной записи.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ChillGuysStudio/asp-checker)

Он работает автоматически в фоновом режиме с использованием Cloudflare Cron Triggers и отправляет вам уведомления прямо в личные сообщения Discord.

## ✨ Возможности

- **Интеграция с Discord**: Полностью управляется через Slash-команды в Discord.
- **Умное распознавание URL**: Автоматически определяет, нужно ли искать свободные даты или проверять статус вашей заявки на запись.
- **Авто-остановка**: При мониторинге заявки на запись скрипт автоматически остановит работу в тот момент, когда обнаружит успешную запись.
- **Без сервера и состояний (Stateless)**: Использует Cloudflare KV для сохранения состояния между запусками, обеспечивая нулевое время простоя и оставаясь в рамках бесплатного тарифа (free tier).
- **Глобальная обработка ошибок**: Необработанные исключения и сбои отправляют полный отчет прямо в ваши личные сообщения в Discord.

## 🤖 Команды Discord

- `/set [url]` - Устанавливает целевой URL для проверки каждые 30 минут. **Примечание:** Вам следует установить ссылку на "заявку" (cerere), которая выглядит примерно так: `https://eservicii.gov.md/asp/dimtcca/cerere/booking_code/some_id`. Бот автоматически преобразует её в правильный скрытый API-ссылку!
- `/fetch` - Принудительно запускает немедленную проверку прямо сейчас.
- `/status` - Отображает текущий активный URL, статус работы и количество проверок за сегодня.
- `/toggle [True/False]` - Вручную включает или выключает фоновую проверку.

## 🛠 Стек технологий

- **Среда выполнения**: [Bun](https://bun.com)
- **Деплой**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Управление состоянием**: Cloudflare KV
- **Язык**: TypeScript

## 👾 Настройка Discord Бота

Чтобы управлять воркером и получать сообщения, вам нужно создать простого Discord-бота:

1. Перейдите на [Discord Developer Portal](https://discord.com/developers/applications).
2. Нажмите **New Application** и назовите его "ASP Checker".
3. На вкладке **Bot** нажмите **Reset Token** и скопируйте **Token**. Это ваш `DISCORD_BOT_TOKEN`.
4. Перейдите на вкладку **General Information** и скопируйте **Application ID** и **Public Key**.
5. Добавьте бота на свой сервер:
   - Перейдите в **OAuth2 > URL Generator**.
   - Отметьте область `bot`.
   - Скопируйте URL, откройте его в браузере и добавьте бота на свой приватный сервер.
6. Узнайте свой собственный Discord User ID:
   - В Discord перейдите в Настройки > Расширенные > Включите "Режим разработчика" (Developer Mode).
   - Щелкните правой кнопкой мыши по своей фотографии профиля на любом сервере и выберите **Copy User ID**. Это ваш `DISCORD_USER_ID`.

## 🚀 Установка и деплой

*(Примечание: Рекомендуется Bun, но если вы предпочитаете, вы можете использовать `npm` вместо `bun` и `npx` вместо `bunx` для всех команд ниже)*

1. Установите зависимости:
   ```bash
   bun install
   ```

2. Авторизуйтесь в Cloudflare:
   ```bash
   bunx wrangler login
   ```

3. Создайте пространство имен KV:
   ```bash
   bunx wrangler kv namespace create "STATE"
   ```
   *(Скопируйте сгенерированный `id` в ваш файл `wrangler.toml`)*

4. Добавьте секреты Discord в ваш Worker:
   ```bash
   bunx wrangler secret put DISCORD_BOT_TOKEN
   bunx wrangler secret put DISCORD_USER_ID
   bunx wrangler secret put DISCORD_PUBLIC_KEY
   bunx wrangler secret put DISCORD_APPLICATION_ID
   ```

5. Выполните деплой!
   ```bash
   bunx wrangler deploy
   ```

## 🔌 Подключение Slash-команд Discord

После деплоя воркера вам нужно указать Discord, куда отправлять команды `/set` и `/fetch`.

1. Скопируйте публичный URL, который выдал вам `wrangler deploy` (например, `https://asp-checker.<username>.workers.dev`).
2. Вернитесь на [Discord Developer Portal](https://discord.com/developers/applications) > **General Information**.
3. Вставьте URL в поле **Interactions Endpoint URL** и сохраните. Discord отправит ping для проверки.
4. Наконец, зарегистрируйте slash-команды для вашего бота, выполнив этот код локально:
   ```bash
   DISCORD_BOT_TOKEN="ваш-токен" DISCORD_APPLICATION_ID="ваш-app-id" bun run register_commands.ts
   ```

*(Для автоматического деплоя через GitHub Actions убедитесь, что вы добавили `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID` в секреты вашего репозитория).*

---
*Отказ от ответственности: Этот проект был создан с использованием Gemini 3.1 Pro (ИИ-инструментов).*
