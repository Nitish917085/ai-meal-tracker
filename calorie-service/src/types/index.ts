/**
 * Shared domain types used across the API.
 */

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

/** Key/value map for micronutrients, e.g. { "vitamin_c": 12, "iron": 4.2 }. */
export type Micronutrients = Record<string, number>;

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

export interface UserMemory {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatHistoryMessage {
  role: ChatRole;
  content: string;
  /** Served image URL for photo attachments (rendered as a thumbnail). */
  imageUrl?: string | null;
  /** Original filename for file attachments (rendered as a file bubble). */
  fileName?: string | null;
}

export interface Goal {
  id: number;
  userId: number;
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  currentWeight: number | null;
  targetWeight: number | null;
  weightGoal: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodEntry {
  id: number;
  userId: number;
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
  createdAt: string;
}

export interface DailyTotals {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export interface MacroBreakdown {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}
