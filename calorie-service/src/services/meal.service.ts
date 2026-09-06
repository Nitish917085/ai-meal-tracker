import * as mealRepo from '../repositories/meal.repo';
import type { MealFilters, MealInput } from '../repositories/meal.repo';
import { notFound } from '../utils/httpError';
import { buildPagination, type PageQuery } from '../utils/pagination';
import type { FoodEntry, Paginated } from '../types';

export async function createMeal(userId: number, input: MealInput): Promise<FoodEntry> {
  return mealRepo.createMeal(userId, input);
}

export async function listMeals(
  userId: number,
  filters: MealFilters,
  page: PageQuery,
): Promise<Paginated<FoodEntry>> {
  const { entries, total } = await mealRepo.listMeals(userId, filters, page);
  return {
    data: entries,
    pagination: buildPagination(page.page, page.pageSize, total),
  };
}

export async function getMeal(userId: number, id: number): Promise<FoodEntry> {
  const meal = await mealRepo.getMealById(id, userId);
  if (!meal) throw notFound('Food entry not found');
  return meal;
}

export async function updateMeal(userId: number, id: number, input: MealInput): Promise<FoodEntry> {
  const meal = await mealRepo.updateMeal(id, userId, input);
  if (!meal) throw notFound('Food entry not found');
  return meal;
}

export async function deleteMeal(userId: number, id: number): Promise<void> {
  const deleted = await mealRepo.deleteMeal(id, userId);
  if (!deleted) throw notFound('Food entry not found');
}

export async function deleteAllMeals(userId: number): Promise<number> {
  return mealRepo.deleteAllMeals(userId);
}

export async function deleteSeededMeals(userId: number): Promise<number> {
  return mealRepo.deleteSeededMeals(userId);
}
