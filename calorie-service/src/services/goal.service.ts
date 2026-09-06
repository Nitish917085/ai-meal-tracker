import * as goalRepo from '../repositories/goal.repo';
import type { GoalInput } from '../repositories/goal.repo';
import { notFound } from '../utils/httpError';
import type { Goal } from '../types';

export async function getActiveGoal(userId: number): Promise<Goal | null> {
  return (await goalRepo.findActiveGoal(userId)) ?? null;
}

export async function listGoals(userId: number): Promise<Goal[]> {
  return goalRepo.listGoals(userId);
}

export async function setGoal(userId: number, input: GoalInput): Promise<Goal> {
  return goalRepo.createGoal(userId, input);
}

export async function updateGoal(userId: number, id: number, input: GoalInput): Promise<Goal> {
  const goal = await goalRepo.updateGoal(id, userId, input);
  if (!goal) throw notFound('Goal not found');
  return goal;
}
