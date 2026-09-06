import { api, buildQuery } from './client';
import type { DailyTotals, MacroTotals, Micronutrients } from '../types';

export interface ReportParams {
  start?: string;
  end?: string;
}

export interface GoalComparison {
  goal: { calories: number; protein: number; carbs: number; fat: number } | null;
  actual: MacroTotals;
  achievement: Record<'calories' | 'protein' | 'carbs' | 'fat', number> | null;
}

export function getDailyTotals(params: ReportParams = {}): Promise<{ data: DailyTotals[] }> {
  return api.get<{ data: DailyTotals[] }>(`/reports/daily${buildQuery({ ...params })}`);
}

export function getMacros(params: ReportParams = {}): Promise<{
  daily: DailyTotals[];
  totals: MacroTotals;
}> {
  return api.get(`/reports/macros${buildQuery({ ...params })}`);
}

export function getMicronutrients(params: ReportParams = {}): Promise<{
  vitamins: Micronutrients;
  minerals: Micronutrients;
}> {
  return api.get(`/reports/micronutrients${buildQuery({ ...params })}`);
}

export function getGoalComparison(params: ReportParams = {}): Promise<GoalComparison> {
  return api.get(`/reports/goal-comparison${buildQuery({ ...params })}`);
}
