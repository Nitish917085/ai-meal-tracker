# Configuration instruction: use the OpenRouter API for dynamic model discovery and selection, with `ONLY_USA=true` to restrict choices to approved US vendors.

# CaloriePal — AI Service

Standalone microservice that owns **every AI-related operation** for CaloriePal:
vision (image → nutrition), text extraction, and the conversational chat agent.

It runs independently from the main data service (`calorie-service`) and the
frontend, so AI logic and its configuration are isolated in one place.

```
ai-services/
  src/
    llm/         # reusable LLM infra: client, model discovery, fallback/retry
    features/    # one file per capability: vision, text, chat
    server/      # HTTP layer: routes, validation, middleware
    config.ts    # environment-driven configuration
```

---

## Endpoints

| Method | Path            | Description                                        | Auth          |
| ------ | --------------- | -------------------------------------------------- | ------------- |
| GET    | `/health`       | Service health check                                | none          |
| POST   | `/extract`      | `multipart/form-data` `file` (image or PDF) → nutrition items | Bearer token¹ |
| POST   | `/extract-text` | `{ text }` → nutrition items                        | Bearer token¹ |
| POST   | `/chat`         | `{ messages }` → `{ reply }` (tool-calling agent)   | Bearer token¹ |
| GET    | `/uploads/*`    | Serves uploaded images back to the client           | none          |

¹ The token is **forwarded** to the calorie service so the chat agent can read/write
the user's data (log meals, check goals, run reports) on their behalf. The AI
service itself does not validate the token.

### Example — extract nutrition from an image

The upload field name is `file`; accepted types are JPEG, PNG, WebP, GIF, and PDF.

```bash
curl -X POST http://localhost:4001/extract \
  -H "Authorization: Bearer <accessToken>" \
  -F "file=@nutrition-label.jpg"
```

```json
{
  "items": [
    { "foodName": "Oatmeal", "mealType": "breakfast", "calories": 320, "protein": 8, "...": "..." }
  ],
  "source": "ai",
  "file": { "name": "1725000000000-123.png", "url": "/uploads/1725000000000-123.png" }
}
```

### Example — chat

```bash
curl -X POST http://localhost:4001/chat \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"how many calories did I have last 3 days?"}]}'
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable               | Default                                        | Description |
| ---------------------- | ---------------------------------------------- | ----------- |
| `PORT`                 | `4001`                                         | Port this service listens on |
| `NODE_ENV`             | `development`                                  | `production` hides internal error details |
| `UPLOADS_DIR`          | `uploads`                                      | Folder (relative to project root) for uploaded images |
| `CALORIE_SERVICE_URL`  | `http://localhost:4000`                        | The main calorie service (chat tool data operations) |
| `AI_PROVIDER`          | `openrouter`                                   | `openrouter` \| `openai` \| `custom` |
| `ONLY_USA`             | `true`                                         | `true` restricts to US vendors (Google, Anthropic, Amazon, Meta, OpenAI, xAI); `false` allows any model |
| `OPENAI_API_KEY`       | *(empty)*                                      | API key (`AI_API_KEY` is an alias) |
| `AI_BASE_URL`          | *(per provider)*                               | Override the provider's base URL |
| `AI_CHAT_MODEL`        | `google/gemini-2.0-flash-exp:free`             | Model for chat (`OPENAI_MODEL` alias) |
| `AI_VISION_MODEL`      | `google/gemini-2.0-flash-exp:free`             | Model for image extraction (`OPENAI_VISION_MODEL` alias) |
| `AI_PAID_FALLBACK_MODEL` | `openai/gpt-4o-mini`                         | Last-resort paid model when no free/configured model works |
| `OPENROUTER_REFERER`   | *(empty)*                                      | Optional `HTTP-Referer` header for OpenRouter attribution |
| `OPENROUTER_TITLE`     | `CaloriePal`                                   | Optional `X-Title` header for OpenRouter |

### Provider presets

Setting `AI_PROVIDER` selects a bundled base URL + default models:

| `AI_PROVIDER` | Base URL                        | Chat model                 | Vision model |
| ------------- | ------------------------------- | -------------------------- | ------------ |
| `openrouter`  | `https://openrouter.ai/api/v1`  | Google Gemini (free)       | Google Gemini (free) |
| `openai`      | `https://api.openai.com/v1`     | `gpt-4o-mini`              | `gpt-4o-mini` |
| `custom`      | `https://api.openai.com/v1`     | *(falls through to env)*   | *(falls through to env)* |

Individual overrides (`AI_BASE_URL`, `AI_CHAT_MODEL`, `AI_VISION_MODEL`) always
win over the preset. Precedence:

```
AI_* override  >  provider preset  >  OPENAI_* legacy  >  fallback
```

---

## Resilience

Free OpenRouter model IDs rotate frequently (models go paid or get removed). The
service is built to self-heal:

1. It queries the provider's `/models` endpoint (cached) to discover currently
   available free models.
2. Each request tries the configured model, then discovered free models, then a
   hardcoded fallback list, then a paid OpenAI model (`openai/gpt-4o-mini`) as a
   last resort — moving to the next candidate on a 4xx.
3. A `401` (auth) or `5xx` (server) error is thrown immediately (switching models
   won't help).

By default (`ONLY_USA=true`) only models from Google, Anthropic (Claude),
Amazon (Nova), Meta (Llama), OpenAI (GPT) and xAI (Grok) are used. Set
`ONLY_USA=false` to allow any model the provider offers.

This fallback/retry logic lives once in `llm/fallback.ts` and is shared by both
vision and chat.
