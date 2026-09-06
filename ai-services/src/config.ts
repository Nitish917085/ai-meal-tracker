import 'dotenv/config';
import path from 'node:path';

/**
 * Central configuration for the AI service. Values are read from environment
 * variables with sensible defaults so the service runs out-of-the-box.
 */
const env = process.env;

/** Parse a boolean env value, accepting 'true'/'1' (case-insensitive). */
function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return value === 'true' || value === '1';
}

/**
 * Project root — the folder containing `ai-services/`, `calorie-service/` and
 * `frontend/`. `__dirname` is one level below `ai-services/` in both dev (src)
 * and compiled (dist) builds, so going up two levels lands on the project root.
 */
const projectRoot = path.resolve(__dirname, '..', '..');

/**
 * AI provider presets. Set `AI_PROVIDER` to switch between them without touching
 * code; individual values can still be overridden via the AI_* / OPENAI_* vars.
 */
type AiProvider = 'openrouter' | 'openai' | 'custom';

interface AiPreset {
  baseUrl: string;
  chatModel: string;
  visionModel: string;
}

const AI_PRESETS: Record<AiProvider, AiPreset> = {
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    // Google Gemini (free, multimodal) for both chat and image extraction.
    chatModel: 'google/gemini-2.0-flash-exp:free',
    visionModel: 'google/gemini-2.0-flash-exp:free',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    chatModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o-mini',
  },
  custom: {
    // Empty: `custom` falls through to the OPENAI_* / AI_* vars.
    baseUrl: '',
    chatModel: '',
    visionModel: '',
  },
};

function resolveProvider(raw: string | undefined): AiProvider {
  const value = (raw ?? 'openrouter').toLowerCase();
  return value in AI_PRESETS ? (value as AiProvider) : 'custom';
}

const aiProvider = resolveProvider(env.AI_PROVIDER);
const aiPreset = AI_PRESETS[aiProvider];

export const config = {
  port: Number(env.PORT ?? 4001),
  nodeEnv: env.NODE_ENV ?? 'development',
  isProduction: env.NODE_ENV === 'production',
  // When true, restrict models to US vendors (Google, Anthropic, Amazon, Meta,
  // OpenAI, xAI). Set to false to allow any model the provider offers.
  onlyUsa: bool(env.ONLY_USA, true),
  // Top-level uploads directory (project root /uploads) where files are saved.
  uploadsDir: path.join(projectRoot, env.UPLOADS_DIR ?? 'uploads'),
  // The main calorie service, used by the chat agent to read/write user data.
  calorieServiceUrl: env.CALORIE_SERVICE_URL ?? 'http://localhost:4000',
  openai: {
    provider: aiProvider,
    apiKey: env.OPENAI_API_KEY ?? env.AI_API_KEY ?? '',
    // Precedence: AI_* override > provider preset > legacy OPENAI_* > fallback.
    baseUrl: env.AI_BASE_URL ?? (aiPreset.baseUrl || env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
    model: env.AI_CHAT_MODEL ?? (aiPreset.chatModel || env.OPENAI_MODEL || 'gpt-4o-mini'),
    visionModel: env.AI_VISION_MODEL ?? (aiPreset.visionModel || env.OPENAI_VISION_MODEL || 'gpt-4o-mini'),
    // Last-resort paid model used when no free/configured model is available.
    paidFallbackModel: env.AI_PAID_FALLBACK_MODEL ?? (aiProvider === 'openai' ? 'gpt-4o-mini' : 'openai/gpt-4o-mini'),
  },
  openrouter: {
    referer: env.OPENROUTER_REFERER ?? '',
    title: env.OPENROUTER_TITLE ?? 'CaloriePal',
  },
} as const;

/** Whether the AI-backed features can call a real LLM. */
export function isAiConfigured(): boolean {
  return config.openai.apiKey.trim().length > 0;
}
