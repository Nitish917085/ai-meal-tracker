import { api } from './client';
import type { Goal } from '../types';

export interface GoalsResponse {
  active: Goal | null;
  history: Goal[];
}

export interface GoalInput {
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  currentWeight?: number | null;
  targetWeight?: number | null;
  weightGoal?: string | null;
}

export function getGoals(): Promise<GoalsResponse> {
  return api.get<GoalsResponse>('/goals');
}

export function setGoal(input: GoalInput): Promise<Goal> {
  return api.post<Goal>('/goals', input);
}

export function updateGoal(id: number, input: GoalInput): Promise<Goal> {
  return api.put<Goal>(`/goals/${id}`, input);
}
