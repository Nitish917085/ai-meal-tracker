import { api, buildQuery } from './client';
import type { FoodEntry, MealType, Micronutrients, Paginated } from '../types';

export interface MealInput {
  mealType: MealType;
  foodName: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  vitamins: Micronutrients;
  minerals: Micronutrients;
  consumedAt: string;
}

export interface MealFilters {
  start?: string;
  end?: string;
  mealType?: MealType;
  page?: number;
  pageSize?: number;
}

export function listMeals(filters: MealFilters = {}): Promise<Paginated<FoodEntry>> {
  return api.get<Paginated<FoodEntry>>(`/meals${buildQuery({ ...filters })}`);
}

export function createMeal(input: MealInput): Promise<FoodEntry> {
  return api.post<FoodEntry>('/meals', input);
}

export function updateMeal(id: number, input: MealInput): Promise<FoodEntry> {
  return api.put<FoodEntry>(`/meals/${id}`, input);
}

export function deleteMeal(id: number): Promise<void> {
  return api.del<void>(`/meals/${id}`);
}
