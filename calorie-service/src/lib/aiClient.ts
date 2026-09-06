import { config } from '../config';

/** Shape returned by the AI service's `/extract` and `/extract-text` endpoints. */
export interface ExtractedFoodItem {
  foodName: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamins: Record<string, number>;
  minerals: Record<string, number>;
}

export interface ExtractionResult {
  items: ExtractedFoodItem[];
  source: 'ai' | 'fallback';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply: string;
  usedFallback: boolean;
}

/**
 * Internal, server-to-server client for the standalone AI service. Used by this
 * service's own logic — it does NOT expose public proxy routes to the frontend.
 *
 * All calls forward the caller's access token so the AI chat agent can act on
 * the user's behalf against this service.
 */
async function aiFetch<T>(
  path: string,
  init: { method?: string; body?: string | FormData; token?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${config.aiServiceUrl}${path}`, {
    method: init.method ?? 'GET',
    headers,
    body: init.body,
  });

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      (data as { error?: string } | null)?.error ?? `AI service error (${response.status})`,
    );
  }

  return data as T;
}

export const aiClient = {
  /** Extract nutrition from an uploaded image file (multipart). */
  extractFromFile(file: { buffer: Buffer; mimetype: string; originalname: string }, token?: string) {
    const form = new FormData();
    // Copy into a Uint8Array backed by a plain ArrayBuffer so it satisfies the
    // BlobPart type (Buffer<ArrayBufferLike> is not assignable).
    form.append('file', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname);
    return aiFetch<ExtractionResult>('/extract', { method: 'POST', body: form, token });
  },

  /** Extract nutrition from raw text. */
  extractFromText(text: string, token?: string) {
    return aiFetch<ExtractionResult>('/extract-text', {
      method: 'POST',
      body: JSON.stringify({ text }),
      token,
    });
  },

  /** Run the conversational chat agent. */
  chat(messages: ChatMessage[], token?: string) {
    return aiFetch<ChatResult>('/chat', {
      method: 'POST',
      body: JSON.stringify({ messages }),
      token,
    });
  },
};
