# CaloriePal — Calorie Service

Main REST API for CaloriePal. Owns authentication, users, goals, food entries,
reports, durable user memories, and chat-history persistence. AI-specific work
(vision/text extraction and the conversational agent) lives in the separate
[`ai-services`](../ai-services) microservice.

| Layer     | Tech                                                        |
| --------- | ----------------------------------------------------------- |
| Runtime   | Node.js + TypeScript, Express                               |
| Database  | PostgreSQL via `pg` (`pg.Pool`), works with local Docker or Supabase |
| Validation| Zod                                                         |
| Auth      | Custom JWT (access) + opaque rotating refresh tokens, bcrypt password hashing, email OTP via nodemailer |
| Supabase  | Optional `@supabase/supabase-js` client for Realtime/Storage/RPC |

The service listens on `http://localhost:4000` and exposes everything under `/api/*`.

---

## Features

- **Auth** — sign up with email verification, log in, refresh, logout, and
  email-based password reset.
- **Goals** — calorie / macro targets plus optional weight goal, with a single
  active goal and retained history.
- **Meals** — CRUD for food entries grouped by meal type, with macro/micro values.
- **Meal dates** — timestamps are stored in UTC, while calendar grouping and report
  ranges use India Standard Time (`Asia/Kolkata`, UTC+05:30).
- **Reports** — daily totals, macro breakdown, micronutrient summary, and
  goal-vs-actual comparison.
- **Bulk import** — persist AI-extracted entries (PDF/image/text) in one request.
- **Memories** — durable facts/preferences the chat agent reads/writes.
- **Chat history** — per-user conversation persistence.
- **Demo seeding** — generate realistic sample data (and remove it) for evaluation.

---

## Prerequisites

- **Node.js 18+** (recommended 20 LTS) and npm.
- **PostgreSQL 14+** — local Docker, Supabase, or any managed Postgres.

---

## Setup

### Quick start

From the repo root, `./dev.sh` starts this service (and the other two) in watch mode.

### Standalone

```bash
cd calorie-service
cp .env.example .env       # then edit values (see below)
docker compose up -d       # local Postgres (skip if using Supabase)
npm install
npm run dev                # http://localhost:4000
```

The schema is applied automatically on startup (idempotent `CREATE TABLE IF NOT
EXISTS`), so there's no manual migration step for a fresh install. A matching
`supabase/schema.sql` is provided for manual migrations via the Supabase SQL editor.

---

## Environment variables

| Variable                  | Default                                                        | Description |
| ------------------------- | -------------------------------------------------------------- | ----------- |
| `PORT`                    | `4000`                                                         | API port |
| `NODE_ENV`                | `development`                                                  | `production` hides internal error details |
| `DATABASE_URL`            | `postgres://postgres:postgres@localhost:5432/calorie_tracker`  | PostgreSQL connection string (local or Supabase) |
| `DB_POOL_MAX`             | `10`                                                           | Max connections in the `pg` pool |
| `DATABASE_SSL`            | `auto` (on for Supabase)                                       | Force SSL on/off for managed Postgres |
| `JWT_SECRET`              | *(dev default)*                                                | **Change in production** — token signing key |
| `JWT_ACCESS_EXPIRES_IN`   | `15m`                                                          | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN`  | `30d`                                                          | Refresh token lifetime |
| `SUPABASE_URL`            | *(empty)*                                                      | Supabase project URL (optional JS client) |
| `SUPABASE_ANON_KEY`       | *(empty)*                                                      | Supabase anon key (optional) |
| `SUPABASE_SERVICE_ROLE_KEY` | *(empty)*                                                    | Supabase service-role key (never expose to client) |
| `AI_SERVICE_URL`          | `http://localhost:4001`                                        | Standalone AI service for server-to-server calls |
| `EMAIL_USER`              | *(empty)*                                                      | Gmail address used to send OTP emails |
| `EMAIL_PASS`              | *(empty)*                                                      | Gmail app password for OTP delivery |
| `BYPASS_FULL_AUTH`        | `false`                                                        | When `true`, skips OTP email verification (dev only) |

---

## API overview

All endpoints except the auth routes require an `Authorization: Bearer <accessToken>`
header. List endpoints accept `page` & `pageSize` and return
`{ data, pagination: { page, pageSize, total, totalPages } }`.

### Auth

| Method | Path                    | Description |
| ------ | ----------------------- | ----------- |
| POST   | `/api/auth/register`    | `{ email, password, name }` → sends a 6-digit OTP |
| POST   | `/api/auth/verify-register` | `{ email, otp }` → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/login`       | `{ email, password }` → `{ user, accessToken, refreshToken }` |
| POST   | `/api/auth/refresh`     | `{ refreshToken }` → fresh token pair (rotates the refresh token) |
| POST   | `/api/auth/logout`      | `{ refreshToken }` → revoke it |
| GET    | `/api/auth/me`          | Current user |
| POST   | `/api/auth/forgot-password` | `{ email }` → sends a reset OTP |
| POST   | `/api/auth/verify-otp`  | `{ email, otp }` → short-lived reset token |
| POST   | `/api/auth/reset-password` | `{ resetToken, newPassword }` → reset (revokes all sessions) |

### Goals

| Method | Path              | Description |
| ------ | ----------------- | ----------- |
| GET    | `/api/goals`      | Active goal + history |
| POST   | `/api/goals`      | Create/activate a goal |
| PUT    | `/api/goals/:id`  | Update a goal |

### Meals

| Method | Path             | Description |
| ------ | ---------------- | ----------- |
| GET    | `/api/meals`     | List entries (`start`, `end`, `mealType`, pagination) |
| POST   | `/api/meals`     | Create a food entry |
| GET    | `/api/meals/:id` | Get one entry |
| PUT    | `/api/meals/:id` | Update an entry |
| DELETE | `/api/meals/:id` | Delete an entry (204) |

A meal's `vitamins` and `minerals` are free-form JSONB objects of key/value
numbers (e.g. `{ "vitamin_c": 12 }`). `consumedAt` accepts either an ISO datetime
or a plain `YYYY-MM-DD` date (normalized to noon India time and stored as UTC).

### Reports

| Method | Path                            | Description |
| ------ | ------------------------------- | ----------- |
| GET    | `/api/reports/daily`            | Daily calorie/macro totals (`start`/`end`, defaults to last 7 days) |
| GET    | `/api/reports/macros`           | Macro breakdown + daily totals |
| GET    | `/api/reports/micronutrients`   | Vitamin/mineral summary |
| GET    | `/api/reports/goal-comparison`  | Goal vs. actual + % achievement |

### Import

| Method | Path                 | Description |
| ------ | -------------------- | ----------- |
| POST   | `/api/import/entries`| `{ entries: [...] }` → bulk import (max 500) |

### Memory

| Method | Path              | Description |
| ------ | ----------------- | ----------- |
| GET    | `/api/memory`     | List saved memories |
| POST   | `/api/memory`     | `{ content }` → save a memory |
| DELETE | `/api/memory/:id` | Delete a memory |

### Chat history

| Method | Path                 | Description |
| ------ | -------------------- | ----------- |
| GET    | `/api/chat-history`  | List persisted messages (paginated) |
| POST   | `/api/chat-history`  | `{ messages: [...] }` → append history |
| DELETE | `/api/chat-history`  | Clear the user's chat history |

### Seed (dev/testing)

| Method | Path       | Description |
| ------ | ---------- | ----------- |
| POST   | `/api/seed`| `{ days? }` → generate demo goal + meals |
| DELETE | `/api/seed`| Remove seeded (demo) entries |

### Health

| Method | Path       | Description |
| ------ | ---------- | ----------- |
| GET    | `/health`  | Service + database health (`200` / `503`) |

---

## Authentication

The service uses its **own custom auth** (not Supabase Auth):

- **Access token** — short-lived JWT (default `15m`) sent as `Bearer` on each request.
- **Refresh token** — opaque, cryptographically-random string (default `30d`),
  stored as a **SHA-256 hash** (never plaintext), with expiry and one-time rotation.
- **Passwords** — bcrypt-hashed (cost 10).
- **Email verification & password reset** — 6-digit OTPs delivered via Gmail SMTP
  (`nodemailer`), valid for 10 minutes. The OTP is accepted once and exchanged
  for a hashed, short-lived, one-time reset token; the raw OTP is never submitted
  again with the new password. Set `EMAIL_USER` / `EMAIL_PASS`, or set
  `BYPASS_FULL_AUTH=true` for development OTP delivery to the console.

---

## Data model

- `users` — id, email (verified flag), name, password hash.
- `refresh_tokens` — SHA-256 hashed tokens, expiry, revocation.
- `goals` — calorie/macro targets, optional weight goal, single active goal.
- `food_entries` — meal type, food name, quantity/unit, macros, JSONB vitamins/minerals.
- `user_memories` — durable facts/preferences for the chat agent.
- `chat_messages` — per-user conversation history (role, content, optional image/file).

IDs are `BIGINT` (parsed back to numbers). Vitamins and minerals are stored as
**JSONB** to stay flexible while remaining queryable.

---

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Run with hot reload (`tsx watch`)    |
| `npm run build`    | Compile TypeScript to `dist/`        |
| `npm run start`    | Run compiled output                  |
| `npm run typecheck`| Type-check without emitting          |

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
    services/            # business logic (auth, meals, goals, reports, chat history, memory, seed)
    routes/              # Express routers (auth, goals, meals, reports, import, memory, chat-history, seed)
    utils/               # pagination, dates, nutrition helpers, http errors
    types/               # shared domain types
    index.ts             # server bootstrap + graceful shutdown
  docker-compose.yml     # local PostgreSQL instance
  supabase/schema.sql    # schema for Supabase SQL editor / manual migrations
```
