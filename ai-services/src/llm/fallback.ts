import { LlmError } from './client';

/**
 * Run `run` against a list of candidate models, transparently moving to the next
 * candidate when a model is unavailable (4xx) or returns no usable result.
 *
 * Shared by vision extraction and chat so model-fallback behaviour is defined once.
 *
 * @param candidates ordered list of model IDs to try
 * @param run         callback that executes the request for a single model; return
 *                    `null` to signal "no usable result — try the next model".
 */
export async function runWithModelFallback<T>(
  candidates: string[],
  run: (model: string) => Promise<T | null>,
): Promise<T> {
  let lastError: unknown = null;

  for (const model of candidates) {
    try {
      const result = await run(model);
      if (result !== null && result !== undefined) return result;
      lastError = new Error(`Model ${model} returned no usable result`);
    } catch (err) {
      lastError = err;
      // 4xx = model missing/unavailable → try the next candidate.
      // 401 (auth) and 5xx (server) won't be fixed by switching models.
      if (err instanceof LlmError && err.status >= 400 && err.status < 500) {
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error('All models failed');
}
