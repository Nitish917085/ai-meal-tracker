# CaloriePal — Personal Calorie Tracker

A full-stack application to monitor, manage and understand daily nutritional intake.
Users can log meals (breakfast, lunch, dinner, snacks), set personalized health goals,
visualize macro/micronutrient trends, and use AI to extract nutrition from photos.

| Layer     | Tech                                                                 |
| --------- | -------------------------------------------------------------------- |
| Backend   | Node.js + TypeScript, Express, PostgreSQL (`pg`), Zod, JWT            |
| Frontend  | React + TypeScript, Vite, Material UI                                |
| AI        | OpenAI-compatible Chat Completions API (optional, graceful fallback)  |

The frontend talks to the backend **exclusively through a REST API** (`/api/*`).

---

## Features

- **Multi-user auth** — sign up, log in, JWT-protected private data.
- **Goal setting** — calorie / protein / carb / fat targets + optional weight goal.
- **Meal entry** — grouped by meal type, with quantity, macros and micros.
- **Time-range listing** — filterable by date range and meal type, with pagination.
- **Reports & graphs** — weekly calorie trend, macro breakdown, micronutrient
  summary, and goal-vs-actual comparison (custom SVG charts, no chart library).
- **AI photo extraction** — upload a nutrition label or plate of food to pre-fill nutrition.
- **Conversational chat** — LLM agent that logs meals, checks goals and summarizes via tools.
- **Bulk PDF import** — parse a food-diary PDF in the browser and import entries.

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

#### Authentication (custom JWT + refresh tokens)

The app uses its **own custom auth** — NOT Supabase Auth:

- `POST /api/auth/register` — bcrypt-hashes the password and stores the user in the
  `users` table, then returns an access + refresh token pair.
- `POST /api/auth/login` — verifies the password with bcrypt and returns the token pair.
- `POST /api/auth/refresh` — exchanges a valid refresh token for a fresh pair
  (rotating the old refresh token, so each can be used only once).
- `POST /api/auth/logout` — revokes the presented refresh token.
- `GET /api/auth/me` — validates the `Authorization: Bearer <accessToken>` header.
- Every protected route passes through the `authenticate` middleware, which verifies
  the JWT and re-checks the user still exists.

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

The AI service handles photo/text nutrition extraction and conversational chat.
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
| `BYPASS_FULL_AUTH`  | `false`                  | Skips OTP email verification when true        |

### AI service (`ai-services/.env`)

AI provider settings (`AI_PROVIDER`, `OPENAI_API_KEY`, model selection, etc.) are
documented in `ai-services/README.md`.

> **AI is optional.** Without an API key the app is fully functional:
> the chat returns a "not configured" message, and photo extraction returns a
> clearly-labeled sample item so you can still exercise the flow.

### Frontend (`frontend/.env`)

| Variable       | Default | Description                                            |
| -------------- | ------- | ------------------------------------------------------ |
| `VITE_API_URL` | *(empty)* | Set to e.g. `http://localhost:4000/api` when not using the dev proxy. |

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

| Method | Path                         | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| POST   | `/api/auth/register`         | Create account → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/login`            | Log in → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/refresh`          | `{ refreshToken }` → fresh token pair    |
| POST   | `/api/auth/logout`           | `{ refreshToken }` → revoke it           |
| GET    | `/api/auth/me`               | Current user                             |
| GET    | `/api/goals`                 | Active + goal history                    |
| POST   | `/api/goals`                 | Create/activate a goal                   |
| PUT    | `/api/goals/:id`             | Update a goal                            |
| GET    | `/api/meals`                 | List entries (`start`, `end`, `mealType`, pagination) |
| POST   | `/api/meals`                 | Create a food entry                      |
| GET    | `/api/meals/:id`             | Get one entry                            |
| PUT    | `/api/meals/:id`             | Update an entry                          |
| DELETE | `/api/meals/:id`             | Delete an entry                          |
| GET    | `/api/reports/daily`         | Daily calorie/macro totals               |
| GET    | `/api/reports/macros`        | Macro breakdown + daily totals           |
| GET    | `/api/reports/micronutrients`| Vitamin/mineral summary                  |
| GET    | `/api/reports/goal-comparison`| Goal vs. actual + % achievement         |
| POST   | `/api/ai/extract`            | Multipart `image` → nutrition items      |
| POST   | `/api/chat`                  | `{ messages }` → `{ reply }`             |
| POST   | `/api/import/entries`        | `{ entries: [...] }` → bulk import       |

---

## File & PDF import

Photos, PDFs, and text files (`.txt`, `.csv`, `.md`, `.json`, etc.) are uploaded to
the **AI service**, which extracts food items using the vision/text model. The
extracted entries are returned to the frontend for review and then saved via the
calorie service — no file is parsed in the browser.

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
- **Dates** — report ranges use `YYYY-MM-DD`; a bare date on a meal is normalized to
  noon UTC so date grouping is consistent across timezones. Grouping/filtering in SQL
  uses `consumed_at AT TIME ZONE 'UTC'`.
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
    pages/               # one component per screen (Log, Insights, Reports, …)
    utils/               # date/format helpers + file dispatch
    theme.ts             # Material UI theme
    main.tsx / App.tsx   # bootstrap + routing
uploads/                 # AI-service image/file uploads (dev only)
dev.sh                   # start all three services in watch mode
```
