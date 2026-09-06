import { config, isAiConfigured } from '../config';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } }
  | { type: 'file'; file: { filename: string; file_data: string } };

export type MessageContent = string | ContentPart[];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: MessageContent | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
  };
}

export interface ChatOptions {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none';
  temperature?: number;
  model?: string;
  jsonMode?: boolean;
}

/** Error carrying the HTTP status so callers can react to 404 (model removed) etc. */
export class LlmError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'LlmError';
    this.status = status;
  }
}

export interface ModelInfo {
  id: string;
  architecture?: {
    input_modalities?: string[];
    modality?: string;
  };
}

/**
 * Thin client over the OpenAI-compatible Chat Completions API. Kept dependency-free
 * (plain fetch) so it can point at any compatible provider via OPENAI_BASE_URL.
 */
export async function chatCompletion(options: ChatOptions): Promise<ChatResponse> {
  if (!isAiConfigured()) {
    throw new Error('AI is not configured. Set OPENAI_API_KEY in ai-services/.env');
  }

  const model = options.model ?? config.openai.model;

  const body: Record<string, unknown> = {
    model,
    messages: options.messages,
    temperature: options.temperature ?? 0.2,
  };
  if (options.tools?.length) body.tools = options.tools;
  if (options.toolChoice) body.tool_choice = options.toolChoice;
  if (options.jsonMode) body.response_format = { type: 'json_object' };

  console.log(`[llm] calling model: ${model}`);

  const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openai.apiKey}`,
      // OpenRouter recommends these for attribution/ranking; harmless elsewhere.
      ...(config.openai.provider === 'openrouter' && config.openrouter.referer
        ? { 'HTTP-Referer': config.openrouter.referer }
        : {}),
      ...(config.openai.provider === 'openrouter'
        ? { 'X-Title': config.openrouter.title }
        : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new LlmError(response.status, `LLM request failed (${response.status}): ${text.slice(0, 500)}`);
  }

  const json = (await response.json()) as {
    choices: Array<{
      message: {
        role: 'assistant';
        content: string | null;
        tool_calls?: ToolCall[];
      };
    }>;
  };

  const choice = json.choices?.[0];
  if (!choice) throw new Error('LLM returned no choices');

  return { message: choice.message };
}

/**
 * Fetch available models from the provider's `/models` endpoint (OpenRouter /
 * OpenAI). Returns an empty array on failure so callers can fall back gracefully.
 */
export async function listAvailableModels(): Promise<ModelInfo[]> {
  if (!isAiConfigured()) return [];
  try {
    const response = await fetch(`${config.openai.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${config.openai.apiKey}` },
    });
    if (!response.ok) return [];
    const json = (await response.json()) as { data?: ModelInfo[] };
    return (json.data ?? []).filter((m) => m && typeof m.id === 'string');
  } catch {
    return [];
  }
}

/**
 * Vendors the service is allowed to use. Models are restricted to:
 * Google, Anthropic (Claude), Amazon (Nova/Titan), Meta (Llama),
 * OpenAI (GPT) and xAI (Grok — the "SpacexAI" family).
 */
const ALLOWED_VENDORS: ReadonlyArray<string> = [
  'google',
  'anthropic',
  'amazon',
  'meta-llama',
  'openai',
  'x-ai',
  'xai',
  'spacexai',
];

/** Model-family prefixes used to recognise direct-provider IDs (no `vendor/`). */
const ALLOWED_MODEL_PREFIXES: ReadonlyArray<string> = [
  'gemini',      // Google
  'palm',        // Google
  'claude',      // Anthropic
  'nova',        // Amazon
  'titan',       // Amazon
  'llama',       // Meta
  'meta-llama',  // Meta
  'gpt-',        // OpenAI
  'o1-',         // OpenAI
  'o3-',         // OpenAI
  'o4-',         // OpenAI
  'grok',        // xAI
];

/** True when a model ID belongs to one of the allowed vendors. */
export function isAllowedVendor(modelId: string): boolean {
  const id = modelId.trim().toLowerCase();
  const slash = id.indexOf('/');
  if (slash !== -1) return ALLOWED_VENDORS.includes(id.slice(0, slash));
  return ALLOWED_MODEL_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/** True when a model may be used, honouring the ONLY_USA restriction. */
export function isUsableModel(modelId: string): boolean {
  if (!config.onlyUsa) return true;
  return isAllowedVendor(modelId);
}

/** True when a model advertises image input support. */
export function isVisionModel(model: ModelInfo): boolean {
  const modalities = model.architecture?.input_modalities;
  if (Array.isArray(modalities) && modalities.length > 0) {
    return modalities.includes('image');
  }
  const modality = model.architecture?.modality;
  if (modality) return modality.toLowerCase().includes('image');
  // Fall back to ID heuristics when metadata is absent.
  return /vl|vision|gemini|flash|claude|nova|gpt-4o|grok|multimodal|omni/.test(model.id.toLowerCase());
}
