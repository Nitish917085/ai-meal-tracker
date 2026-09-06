import { aiApi, api, buildQuery } from './client';
import type { Pagination } from '../types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Served image URL for photo attachments. */
  imageUrl?: string | null;
  /** Original filename for file attachments. */
  fileName?: string | null;
}

export interface ChatResponse {
  reply: string;
  usedFallback: boolean;
}

export function sendChat(messages: ChatMessage[]): Promise<ChatResponse> {
  return aiApi.post<ChatResponse>('/chat', { messages });
}

// --- Chat history (persisted in PostgreSQL via the calorie service) ---

export function listChatHistory(page = 1, pageSize = 50): Promise<{ messages: ChatMessage[]; pagination: Pagination }> {
  return api.get<{ messages: ChatMessage[]; pagination: Pagination }>(
    `/chat-history${buildQuery({ page, pageSize })}`,
  );
}

export function appendChatHistory(messages: ChatMessage[]): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/chat-history', { messages });
}

export function clearChatHistory(): Promise<{ ok: boolean }> {
  return api.del<{ ok: boolean }>('/chat-history');
}
