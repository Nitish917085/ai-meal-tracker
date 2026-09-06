import * as mealRepo from '../repositories/meal.repo';
import * as goalRepo from '../repositories/goal.repo';
import { mergeMicros, round } from '../utils/nutrition';
import type { DailyTotals, MacroBreakdown, Micronutrients } from '../types';

export async function getDailyTotals(userId: number, start: string, end: string): Promise<DailyTotals[]> {
  const rows = await mealRepo.getDailyTotals(userId, start, end);
  return rows.map((row) => ({
    date: row.date,
    calories: round(row.calories),
    protein: round(row.protein),
    carbs: round(row.carbs),
    fat: round(row.fat),
    fiber: round(row.fiber),
    sugar: round(row.sugar),
    sodium: round(row.sodium),
  }));
}

export async function getMacroBreakdown(userId: number, start: string, end: string): Promise<{
  daily: DailyTotals[];
  totals: MacroBreakdown;
}> {
  const daily = await getDailyTotals(userId, start, end);
  const totals = await mealRepo.getMacroTotals(userId, start, end);
  return {
    daily,
    totals: {
      protein: round(totals.protein),
      carbs: round(totals.carbs),
      fat: round(totals.fat),
      calories: round(totals.calories),
    },
  };
}

export async function getMicronutrientSummary(userId: number, start: string, end: string): Promise<{
  vitamins: Micronutrients;
  minerals: Micronutrients;
}> {
  const rows = await mealRepo.getMicros(userId, start, end);
  return {
    vitamins: mergeMicros(rows.map((r) => r.vitamins)),
    minerals: mergeMicros(rows.map((r) => r.minerals)),
  };
}

export async function getGoalComparison(userId: number, start: string, end: string): Promise<{
  goal: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
  actual: MacroBreakdown;
  achievement: Record<'calories' | 'protein' | 'carbs' | 'fat', number> | null;
}> {
  const goal = await goalRepo.findActiveGoal(userId);
  const actual = await mealRepo.getMacroTotals(userId, start, end);

  const totals: MacroBreakdown = {
    calories: round(actual.calories),
    protein: round(actual.protein),
    carbs: round(actual.carbs),
    fat: round(actual.fat),
  };

  if (!goal) return { goal: null, actual: totals, achievement: null };

  const target = {
    calories: goal.calorieTarget,
    protein: goal.proteinTarget,
    carbs: goal.carbTarget,
    fat: goal.fatTarget,
  };

  const achievement = {
    calories: percent(totals.calories, target.calories),
    protein: percent(totals.protein, target.protein),
    carbs: percent(totals.carbs, target.carbs),
    fat: percent(totals.fat, target.fat),
  };

  return { goal: target, actual: totals, achievement };
}

function percent(actual: number, target: number): number {
  if (!target) return 0;
  return round((actual / target) * 100);
}
