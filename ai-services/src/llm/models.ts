import { config } from '../config';
import { isUsableModel, isVisionModel, listAvailableModels, type ModelInfo } from './client';

// Hardcoded fallbacks — only used when dynamic discovery fails. Free tiers
// rotate often, so this is a best-effort safety net (currently Google Gemma).
const CHAT_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-4-31b-it:free',
];

// No free vision model from the allowed vendors is currently available on
// OpenRouter — vision falls through to the paid fallback model.
const VISION_FALLBACK_MODELS: string[] = [];

// Discovery is cached so the provider's model list is fetched at most once.
let chatModelCache: string[] | null = null;
let visionModelCache: string[] | null = null;

/** Discover free model IDs from the provider, optionally filtered by a predicate. */
async function discoverFreeModels(predicate?: (m: ModelInfo) => boolean): Promise<string[]> {
  const models = await listAvailableModels();
  return models
    .filter((m) => m.id.endsWith(':free') && isUsableModel(m.id) && (!predicate || predicate(m)))
    .map((m) => m.id);
}

/** Deduplicate (and trim) an ordered list of model IDs. */
function dedupe(ids: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      ordered.push(trimmed);
    }
  }
  return ordered;
}

/**
 * Ordered chat-model candidates: configured model → discovered free models →
 * hardcoded fallback list → paid OpenAI model (last resort).
 */
export async function resolveChatModelCandidates(): Promise<string[]> {
  if (chatModelCache === null) {
    chatModelCache = await discoverFreeModels();
  }
  // Filter again so an explicitly configured model that isn't from an allowed
  // vendor is skipped rather than silently used (when ONLY_USA is enabled).
  const candidates = dedupe([config.openai.model, ...chatModelCache, ...CHAT_FALLBACK_MODELS]).filter(isUsableModel);
  // Always keep a paid OpenAI model as the last-resort fallback.
  return [...candidates, config.openai.paidFallbackModel];
}

/**
 * Ordered vision-model candidates: configured model → discovered free vision
 * models → hardcoded fallback list → paid OpenAI model (last resort).
 */
export async function resolveVisionModelCandidates(): Promise<string[]> {
  if (visionModelCache === null) {
    visionModelCache = await discoverFreeModels(isVisionModel);
  }
  const candidates = dedupe([config.openai.visionModel, ...visionModelCache, ...VISION_FALLBACK_MODELS]).filter(isUsableModel);
  return [...candidates, config.openai.paidFallbackModel];
}
