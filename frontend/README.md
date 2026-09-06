# CaloriePal — Frontend

React single-page app for CaloriePal. Talks to the **calorie service** over a REST
API (`/api/*`) and to the standalone **AI service** directly at
`http://localhost:4001` for nutrition extraction and chat.

| Layer     | Tech                                             |
| --------- | ------------------------------------------------ |
| Framework | React 18 + TypeScript, Vite                      |
| UI        | Material UI (MUI v5) + Emotion                   |
| Routing   | React Router v6                                  |
| Charts    | Custom SVG components (no chart library)         |
| Markdown  | `marked` + `dompurify` (sanitized chat replies)  |

The dev server runs on `http://localhost:5173` and proxies `/api` to
`http://localhost:4000`.

---

## Pages

| Route              | Page                 | Description |
| ------------------ | -------------------- | ----------- |
| `/login`           | `LoginPage`          | Sign in |
| `/register`        | `RegisterPage`       | Create account (with OTP verification step) |
| `/forgot-password` | `ForgotPasswordPage` | Request/reset password via OTP |
| `/`                | `LogPage`            | Home — log meals and chat with the AI assistant |
| `/insights`        | `InsightsPage`       | Insights with tabs for meal history and reports |
| `/goals`           | `GoalsPage`          | View/edit nutrition & weight goals |
| `/import`          | `ImportPage`         | Bulk import via AI extraction (PDF/image/text) |

Legacy routes redirect to the current structure: `/chat` → `/`, `/meals` →
`/insights?tab=meals`, `/reports` → `/insights?tab=reports`.

---

## Features

- **Auth flow** — sign up, OTP email verification, login, forgot-password/reset,
  with transparent refresh-token handling and session restore.
- **Log meals** — add/edit/delete entries by meal type with macros and micros.
- **AI chat** — conversational assistant that logs meals, checks goals, and
  summarizes reports (persisted chat history).
- **Insights** — daily trends, macro breakdown, micronutrients, and goal comparison
  (custom SVG charts).
- **Goals** — set calorie/macro targets and an optional weight goal.
- **Import** — extract nutrition from images, PDFs, or text and review before saving.
- **Demo data** — seed/reset sample data for evaluation.

---

## Setup

```bash
cd frontend
cp .env.example .env       # optional; leave VITE_API_URL empty for the dev proxy
npm install
npm run dev                # http://localhost:5173
```

Open **http://localhost:5173**, create an account (set `BYPASS_FULL_AUTH=true` on
the calorie service to skip email verification in local dev), and log in.

---

## Environment variables

| Variable       | Default                  | Description |
| -------------- | ------------------------ | ----------- |
| `VITE_API_URL` | *(empty)*                | Backend API origin. Leave empty to use the Vite dev proxy at `/api`. Set e.g. `http://localhost:4000/api` for separate deployments. |
| `VITE_AI_URL`  | `http://localhost:4001`  | Base URL of the standalone AI service (extraction + chat). |

---

## Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start Vite dev server                |
| `npm run build`    | Type-check then production build     |
| `npm run preview`  | Preview the production build         |
| `npm run typecheck`| Type-check without emitting          |

---

## Project structure

```
frontend/
  src/
    api/                 # typed API client + per-resource modules (auth, meals, goals, chat, import, …)
    components/          # layout, charts, meal form/dialog, route guard, common
    context/             # auth context (session restore) + feedback context
    hooks/               # shared hooks (today overview)
    pages/               # one component per screen
    styles/              # global CSS
    types/               # shared TypeScript types
    utils/               # date/format helpers + file dispatch
    theme.ts             # Material UI theme
    main.tsx / App.tsx   # bootstrap + routing
  vite.config.ts         # dev proxy (/api → localhost:4000)
```
