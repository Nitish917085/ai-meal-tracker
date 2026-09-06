import * as memoryRepo from '../repositories/memory.repo';
import { notFound } from '../utils/httpError';
import type { UserMemory } from '../types';

export async function listMemories(userId: number): Promise<UserMemory[]> {
  return memoryRepo.listMemories(userId);
}

export async function addMemory(userId: number, content: string): Promise<UserMemory> {
  return memoryRepo.createMemory(userId, content.trim());
}

export async function removeMemory(userId: number, id: number): Promise<void> {
  const removed = await memoryRepo.deleteMemory(id, userId);
  if (!removed) throw notFound('Memory not found');
}
