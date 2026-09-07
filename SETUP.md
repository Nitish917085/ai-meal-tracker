# Setup instruction: configure the AI service with OpenRouter, enable dynamic model selection, and set `ONLY_USA=true`.

# I’m provided the environment files for both services for quick setup: ai-services.env and calorie-service.env in gdrive link as additonal comment in assigment form.

# All API keys and tokens included in these files will expire in 5 days. The environment files are being provided solely for demo purposes to enable quick and easy setup.

# CaloriePal Setup

This guide explains how to configure and run CaloriePal locally.

## Requirements

- Node.js 18+ (Node.js 20 LTS recommended)
- npm
- Docker Desktop, for local PostgreSQL

## 1. Configure the backend

```bash
cd calorie-service
cp .env.example .env
```

For local development, the default database settings are sufficient:

```dotenv
DATABASE_URL=postgres://postgres:postgres@localhost:5432/calorie_tracker
DATABASE_SSL=false
JWT_SECRET=change-this-to-a-long-random-string
AI_SERVICE_URL=http://localhost:4001
```

To use email OTP verification, configure Gmail SMTP:

```dotenv
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
BYPASS_FULL_AUTH=false
```

For local testing without email delivery, use:

```dotenv
BYPASS_FULL_AUTH=true
```

OTP codes will be printed in the backend terminal.

## 2. Configure the AI service

```bash
cd ../ai-services
cp .env.example .env
```

Set an OpenAI-compatible provider key in `ai-services/.env`:

```dotenv
AI_PROVIDER=openrouter
OPENAI_API_KEY=your-api-key
AI_CHAT_MODEL=google/gemini-2.0-flash-exp:free
AI_VISION_MODEL=google/gemini-2.0-flash-exp:free
CALORIE_SERVICE_URL=http://localhost:4000
```

Do not commit `.env` files or expose API keys in screenshots, recordings, or source control.

## 3. Configure the frontend

```bash
cd ../frontend
cp .env.example .env
```

The default local values are:

```dotenv
VITE_API_URL=
VITE_AI_URL=http://localhost:4001
```

Leave `VITE_API_URL` empty to use the Vite proxy.

## 4. Start PostgreSQL

From the `calorie-service` directory:

```bash
docker compose up -d
```

The backend creates the required tables automatically when it starts.

## 5. Install dependencies

From the repository root:

```bash
npm --prefix calorie-service install
npm --prefix ai-services install
npm --prefix frontend install
```

## 6. Run the application

### Start all services

From the repository root:

```bash
./dev.sh
```

The services run at:

- Frontend: http://localhost:5173
- Calorie service: http://localhost:4000
- AI service: http://localhost:4001

Press `Ctrl+C` to stop all services.

### Start services individually

Open three terminals from the repository root:

```bash
cd calorie-service && npm run dev
```

```bash
cd ai-services && npm run dev
```

```bash
cd frontend && npm run dev
```

## 7. First login

1. Open http://localhost:5173.
2. Select **Sign up**.
3. Enter your name, email, and password.
4. Enter the OTP sent to your email.
5. Configure your initial nutrition goals, or choose **Skip for now**.
6. Use the Home page to log meals or open Import to upload a food image.

## Health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4001/health
```

Both services should return a healthy status.

## Useful checks

```bash
npm --prefix calorie-service run typecheck
npm --prefix ai-services run typecheck
npm --prefix frontend run typecheck
```

Meal timestamps are stored as UTC. Calendar grouping, reports, and displayed times use India Standard Time (`Asia/Kolkata`, UTC+05:30).
