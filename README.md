# Setup instruction: use the OpenRouter API with dynamic model/provider discovery and set `ONLY_USA=true` in `ai-services/.env`.

**Quick setup:** [SETUP.md](SETUP.md)

# CaloriePal — Personal Calorie Tracker

A full-stack application to monitor, manage and understand daily nutritional intake.
Users can log meals (breakfast, lunch, dinner, snacks), set personalized health goals,
visualize macro/micronutrient trends, and use AI to extract nutrition from photos,
files, and conversation.

| Layer     | Tech                                                                 |
| --------- | -------------------------------------------------------------------- |
| Backend   | Node.js + TypeScript, Express, PostgreSQL (`pg`), Zod, JWT            |
| Frontend  | React + TypeScript, Vite, Material UI                                |
| AI        | OpenAI-compatible Chat Completions API (optional, graceful fallback)  |

The frontend talks to the calorie service through a REST API (`/api/*`) and to the
standalone AI service directly at `http://localhost:4001` for extraction and chat.

**Demo video:** https://drive.google.com/file/d/1aWPXCi_cZxAx2oQDrEfCgI8sR9ySS5pX/view?usp=drive_link
---

## Features

- **Multi-user auth** — sign up (email + OTP verification), log in, JWT-protected
  private data, and email-based password reset.
- **Goal setting** — calorie / protein / carb / fat targets + optional weight goal.
- **First-run onboarding** — new users can save or skip initial nutrition and weight goals.
- **Meal entry** — grouped by meal type, with quantity, macros and micros.
- **Time-range listing** — filterable by date range and meal type, with pagination.
- **Meal details** — click a meal to view read-only nutrition details; edit from its action menu.
- **Reports & graphs** — weekly calorie trend, macro breakdown, micronutrient
  summary, and goal-vs-actual comparison (custom SVG charts, no chart library).
- **Daily macro chart** — stacked per-day protein, carbohydrate, and fat visualization.
- **AI photo extraction** — upload a nutrition label or plate of food to pre-fill nutrition.
- **Conversational chat** — LLM agent that logs meals, checks goals and summarizes via tools.
- **AI bulk import** — extract nutrition from PDFs, images, or text and import in bulk.
- **Quick re-log** — choose a recent food from the Home page and log it again in one tap.
- **Voice input** — dictate meal descriptions and questions with automatic silence detection.
- **Durable memories** — the chat agent remembers user facts/preferences across sessions.
- **Chat history** — conversations persisted per user in PostgreSQL.
- **Demo data seeding** — one command to populate realistic sample data for evaluation.

---

## Prerequisites

- **Node.js 18+** (recommended 20 LTS) and npm.
- **PostgreSQL 14+** — local Docker, Supabase, or any managed Postgres.
- Docker (optional) to run Postgres locally with one command.

---

## Setup

### Quick start — run everything at once

```bash
./dev.sh    # installs deps, then starts all three services in watch mode
```

- `calorie-service` → http://localhost:4000
- `ai-services`     → http://localhost:4001
- `frontend`        → http://localhost:5173

Press Ctrl+C to stop them all. To run the services individually, follow the
sections below.

### 1. Backend (`calorie-service`)

```bash
cd calorie-service
cp .env.example .env          # then edit values (see "Environment variables")
docker compose up -d          # local Postgres (skip if using Supabase)
npm install
npm run dev                   # starts the API on http://localhost:4000
```

The database schema is applied automatically on startup (idempotent `CREATE TABLE
IF NOT EXISTS` statements), so there is no manual migration step for a fresh install.

### Supabase (hosted PostgreSQL for online/production)

Supabase is a hosted Postgres service — the backend connects to it with the same
`pg` client, no code changes required.

1. Create a project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database → Connection string**, copy the **transaction
   pooler** URL (port `6543`), e.g.
   `postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-<REGION>.pooler.supabase.com:6543/postgres`.
3. Set it in `calorie-service/.env`:

   ```bash
   DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<PASSWORD>@...pooler.supabase.com:6543/postgres
   # SSL is enabled automatically for Supabase URLs — no DATABASE_SSL needed.
   ```

4. Start the backend — the tables are created automatically on first connection.

> **Prefer manual migrations?** Run `calorie-service/supabase/schema.sql` in the Supabase
> SQL editor (or via `supabase db push`) instead of letting the app create tables.
> The SQL file is identical to the auto-applied schema.

#### Authentication (custom JWT + refresh tokens + email OTP)

The app uses its **own custom auth** — NOT Supabase Auth:

- `POST /api/auth/register` — bcrypt-hashes the password, stores the user in the
  `users` table (as unverified), and sends a 6-digit OTP to the email address.
- `POST /api/auth/verify-register` — verifies the OTP, marks the email verified, and
  returns an access + refresh token pair.
- `POST /api/auth/login` — verifies the password with bcrypt, checks the email is
  verified, and returns the token pair.
- `POST /api/auth/refresh` — exchanges a valid refresh token for a fresh pair
  (rotating the old refresh token, so each can be used only once).
- `POST /api/auth/logout` — revokes the presented refresh token.
- `GET /api/auth/me` — validates the `Authorization: Bearer <accessToken>` header.
- `POST /api/auth/forgot-password` — sends a password-reset OTP to the email.
- `POST /api/auth/verify-otp` — confirms the OTP matches the most recently issued one.
- `POST /api/auth/reset-password` — verifies the OTP and sets the new password
  (revoking all existing sessions).
- Every protected route passes through the `authenticate` middleware, which verifies
  the JWT and re-checks the user still exists.

> **OTP email delivery** uses Gmail SMTP (`nodemailer`). Set `EMAIL_USER` /
> `EMAIL_PASS` (a Gmail app password) in `calorie-service/.env`. For local
> development, set `BYPASS_FULL_AUTH=true` to skip OTP verification entirely —
> the codes are printed to the server console instead of emailed.

**Token strategy**

- **Access token** — a short-lived JWT (default `15m`) sent as `Bearer` on each request.
- **Refresh token** — an opaque, cryptographically-random string (default `30d`),
  stored in the `refresh_tokens` table as a **SHA-256 hash** (never plaintext), with
  expiry and revocation support.

The frontend stores both tokens and transparently refreshes on a `401`, deduplicating
concurrent refreshes. Passwords are bcrypt-hashed (cost 10). Expiries are configured
via `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`, and the signing key via
`JWT_SECRET`.

#### Supabase JS client (Realtime / Storage — optional)

In addition to the direct Postgres connection, the backend ships an optional
**`@supabase/supabase-js`** client (`src/lib/supabase.ts`) for the hosted Supabase
features that need an API client (Realtime, Storage, RPC). It is **not** used for
login — authentication stays custom. Set these in `calorie-service/.env` to enable it:

```bash
SUPABASE_URL=https://<PROJECT_REF>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<secret-service-role-key>
```

Then import it anywhere in the backend:

```ts
import { getSupabase, requireSupabase } from './lib/supabase';

const supabase = requireSupabase(); // throws if not configured
// await supabase.storage.from('photos').upload(...);
// supabase.channel('meals').on('postgres_changes', ...).subscribe();
```

> **Important:** `@supabase/supabase-js` talks to PostgREST and **cannot run raw
> SQL**. The app's data layer (`repositories/*`) therefore keeps using the `pg`
> pool for queries, while the Supabase client is for Realtime/Storage/RPC.
> The **service-role key bypasses Row Level Security** — never send it to the browser.

### 2. Frontend

```bash
cd frontend
cp .env.example .env       # optional; leave VITE_API_URL empty for the dev proxy
npm install
npm run dev                # starts the app on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so no CORS setup is
needed during development.

Open **http://localhost:5173**, create an account, and you're ready to go.

### 3. AI service (`ai-services`)

```bash
cd ai-services
cp .env.example .env          # optional; sensible defaults are built in
npm install
npm run dev                   # starts the AI service on http://localhost:4001
```

The AI service handles image/PDF/text nutrition extraction and conversational chat.
It forwards the user's access token to the calorie service to read/write data on
their behalf. See `ai-services/README.md` for provider configuration.

---

## Environment variables

### Backend (`calorie-service/.env`)

| Variable            | Default                  | Description                                   |
| ------------------- | ------------------------ | --------------------------------------------- |
| `PORT`              | `4000`                   | API port                                      |
| `NODE_ENV`          | `development`            | `production` hides internal error details     |
| `DATABASE_URL`      | `postgres://postgres:postgres@localhost:5432/calorie_tracker` | PostgreSQL connection string (local or Supabase) |
| `DB_POOL_MAX`       | `10`                     | Max connections in the `pg` pool              |
| `DATABASE_SSL`      | `auto` (on for Supabase) | Force SSL on/off for managed Postgres         |
| `JWT_SECRET`           | *(dev default)*       | **Change in production** — token signing key  |
| `JWT_ACCESS_EXPIRES_IN` | `15m`               | Access token lifetime                         |
| `JWT_REFRESH_EXPIRES_IN`| `30d`               | Refresh token lifetime                        |
| `AI_SERVICE_URL`    | `http://localhost:4001`  | Standalone AI service the backend can call    |
| `EMAIL_USER`        | *(empty)*                | Gmail address used to send OTP emails         |
| `EMAIL_PASS`        | *(empty)*                | Gmail app password for OTP delivery           |
| `BYPASS_FULL_AUTH`  | `false`                  | Skips OTP email verification when true        |

### AI service (`ai-services/.env`)

AI provider settings (`AI_PROVIDER`, `OPENAI_API_KEY`, model selection, etc.) are
documented in `ai-services/README.md`.

> **AI is optional.** Without an API key the app is fully functional:
> the chat returns a "not configured" message, and photo extraction returns a
> clearly-labeled sample item so you can still exercise the flow.

### Frontend (`frontend/.env`)

| Variable       | Default                  | Description                                            |
| -------------- | ------------------------ | ------------------------------------------------------ |
| `VITE_API_URL` | *(empty)*                | Set to e.g. `http://localhost:4000/api` when not using the dev proxy. |
| `VITE_AI_URL`  | `http://localhost:4001`  | Base URL of the standalone AI service (extraction + chat). |

---

## Scripts

### Backend

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Run with hot reload (`tsx watch`)    |
| `npm run build`    | Compile TypeScript to `dist/`        |
| `npm run start`    | Run compiled output                  |
| `npm run typecheck`| Type-check without emitting          |

### Frontend

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start Vite dev server                |
| `npm run build`    | Type-check then production build     |
| `npm run preview`  | Preview the production build         |
| `npm run typecheck`| Type-check without emitting          |

---

## API overview

All endpoints (except auth) require an `Authorization: Bearer <accessToken>` header.
List endpoints support `page` & `pageSize` query params and return
`{ data, pagination: { page, pageSize, total, totalPages } }`.

| Method | Path                          | Description                              |
| ------ | ----------------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`          | Create account → sends OTP               |
| POST   | `/api/auth/verify-register`   | `{ email, otp }` → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/login`             | Log in → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/refresh`           | `{ refreshToken }` → fresh token pair    |
| POST   | `/api/auth/logout`            | `{ refreshToken }` → revoke it           |
| GET    | `/api/auth/me`                | Current user                             |
| POST   | `/api/auth/forgot-password`   | `{ email }` → sends reset OTP            |
| POST   | `/api/auth/verify-otp`        | `{ email, otp }` → confirm OTP           |
| POST   | `/api/auth/reset-password`    | `{ email, otp, newPassword }` → reset    |
| GET    | `/api/goals`                  | Active + goal history                    |
| POST   | `/api/goals`                  | Create/activate a goal                   |
| PUT    | `/api/goals/:id`              | Update a goal                            |
| GET    | `/api/meals`                  | List entries (`start`, `end`, `mealType`, pagination) |
| POST   | `/api/meals`                  | Create a food entry                      |
| GET    | `/api/meals/:id`              | Get one entry                            |
| PUT    | `/api/meals/:id`              | Update an entry                          |
| DELETE | `/api/meals/:id`              | Delete an entry                          |
| GET    | `/api/reports/daily`          | Daily calorie/macro totals               |
| GET    | `/api/reports/macros`         | Macro breakdown + daily totals           |
| GET    | `/api/reports/micronutrients` | Vitamin/mineral summary                  |
| GET    | `/api/reports/goal-comparison`| Goal vs. actual + % achievement          |
| POST   | `/api/import/entries`         | `{ entries: [...] }` → bulk import       |
| GET    | `/api/memory`                 | List saved user memories                 |
| POST   | `/api/memory`                 | `{ content }` → save a memory            |
| DELETE | `/api/memory/:id`             | Delete a memory                          |
| GET    | `/api/chat-history`           | List persisted chat messages (paginated) |
| POST   | `/api/chat-history`           | `{ messages: [...] }` → append history   |
| DELETE | `/api/chat-history`           | Clear the user's chat history            |
| POST   | `/api/seed`                   | `{ days? }` → generate demo data         |
| DELETE | `/api/seed`                   | Remove seeded (demo) entries             |

> **AI endpoints** (`/extract`, `/extract-text`, `/chat`) are served by the
> standalone **`ai-services`** app at `http://localhost:4001` and are documented in
> `ai-services/README.md`. The frontend calls them directly (not via this API).

---

## File & PDF import

Photos and PDFs are uploaded to the **AI service**, which extracts food items using
the vision model. Text files such as `.txt`, `.csv`, `.md`, `.json`, and `.log` are
sent through the text extraction endpoint. The extracted entries are returned to
the frontend for review and then saved via the calorie service — no file is parsed
in the browser.

The extractor handles nutrition-label photos, plates of food, tabular PDF food
diaries, and free-text lists. Entries come back with `foodName`, `mealType`,
`quantity`, `unit`, and macro/micro values; any item without a recognizable date
defaults to the current day.

---

## Assumptions & decisions

- **Data model** — `users`, `goals`, `food_entries`, `refresh_tokens`,
  `user_memories`, and `chat_messages` tables. Vitamins and minerals are stored as
  **JSONB** on each entry (arbitrary key/value pairs that vary by food), which keeps
  the schema flexible while remaining queryable.
- **Single active goal** — creating a new goal deactivates prior goals; history is
  retained for reference.
- **Dates and time** — timestamps are stored as UTC ISO values, while calendar
  grouping, report ranges, “today,” seeded meal times, and displayed meal times use
  India Standard Time (`Asia/Kolkata`, UTC+05:30). A bare meal date is normalized
  to noon IST before being stored as UTC.
- **PostgreSQL** — connection pooling via `pg.Pool`, parameterized queries throughout,
  `BIGINT` IDs (parsed back to numbers), and graceful shutdown on SIGINT/SIGTERM.
  Works with any Postgres host: local Docker or **Supabase** (SSL is auto-enabled for
  Supabase URLs). Schema is applied idempotently on startup, and an equivalent
  `supabase/schema.sql` is provided for manual migrations; for multi-environment
  production, swap in a real migration tool (e.g. `node-pg-migrate`).
- **No chart dependency** — reports are rendered with small, dependency-free SVG
  components to keep the bundle lean (per the "use Material UI for UI" guidance).
- **AI graceful degradation** — all AI features fall back safely when no API key is
  configured, so the app can be evaluated end-to-end without external services.
- **Errors** — a consistent `{ error, details? }` JSON shape, with input validation via
  Zod and detailed messages hidden in production.

---

## Project structure

```
calorie-service/
  src/
    config.ts            # env-driven configuration
    validation.ts        # Zod schemas shared by routes
    db/connection.ts     # pg connection pool + schema init
    middleware/          # auth, validation, error handling, async wrapper
    repositories/        # data-access layer (parameterized SQL)
    services/            # business logic (auth, meals, goals, reports, chat history)
    routes/              # Express routers
    utils/               # pagination, dates, nutrition helpers, http errors
    types/               # shared domain types
    index.ts             # server bootstrap + graceful shutdown
  docker-compose.yml     # local PostgreSQL instance
  supabase/schema.sql    # schema for Supabase SQL editor / manual migrations
ai-services/
  src/
    config.ts            # AI provider configuration
    features/            # vision, text extraction, chat agent + tools
    llm/                 # OpenAI-compatible client, model resolution, fallback
    server/              # routes, validation, middleware
frontend/
  src/
    api/                 # typed API client + per-resource modules
    components/          # layout, charts, meal form, route guard
    context/             # auth context (session restore)
    pages/               # one component per screen (Home, Insights, Goals, Import, …)
    utils/               # date/format helpers + file dispatch
    theme.ts             # Material UI theme
    main.tsx / App.tsx   # bootstrap + routing
uploads/                 # AI-service image/file uploads (dev only)
dev.sh                   # start all three services in watch mode
```
