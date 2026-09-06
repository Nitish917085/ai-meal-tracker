import { api } from './client';
import type { MealType, Micronutrients } from '../types';

export interface ImportEntry {
  foodName: string;
  mealType: MealType;
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

export interface ImportResponse {
  imported: number;
  items: unknown[];
}

export function importEntries(entries: ImportEntry[]): Promise<ImportResponse> {
  return api.post<ImportResponse>('/import/entries', { entries });
}
