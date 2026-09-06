export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type Micronutrients = Record<string, number>;

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

export interface ExtractionResult {
  items: ExtractedFoodItem[];
  source: 'ai' | 'fallback';
}
