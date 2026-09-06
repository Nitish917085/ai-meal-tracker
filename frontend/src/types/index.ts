export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Micronutrients = Record<string, number>;

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
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

export interface MacroTotals {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface ExtractedFoodItem {
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
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}
