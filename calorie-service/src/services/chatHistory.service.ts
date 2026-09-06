import * as chatHistoryRepo from '../repositories/chatHistory.repo';
import { buildPagination, type PageQuery } from '../utils/pagination';
import type { ChatHistoryMessage, Pagination } from '../types';

export async function listChatHistory(
  userId: number,
  page: PageQuery,
): Promise<{ messages: ChatHistoryMessage[]; pagination: Pagination }> {
  const { messages, total } = await chatHistoryRepo.listMessages(userId, page);
  return { messages, pagination: buildPagination(page.page, page.pageSize, total) };
}

export async function appendChatHistory(
  userId: number,
  messages: ChatHistoryMessage[],
): Promise<void> {
  await chatHistoryRepo.appendMessages(userId, messages);
}

export async function clearChatHistory(userId: number): Promise<void> {
  await chatHistoryRepo.clearMessages(userId);
}
