import { z } from 'zod';
import type { ExtractedFoodItem } from './types';

export const itemSchema = z.object({
  food_name: z.string().min(1),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('snack'),
  quantity: z.number().positive().default(1),
  unit: z.string().default('serving'),
  calories: z.number().nonnegative().default(0),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
  fiber: z.number().nonnegative().default(0),
  sugar: z.number().nonnegative().default(0),
  sodium: z.number().nonnegative().default(0),
  vitamins: z.record(z.string(), z.number()).default({}),
  minerals: z.record(z.string(), z.number()).default({}),
});

export const responseSchema = z.object({
  items: z.array(itemSchema).default([]),
});

/** Map parsed model output into the public shape. */
export function mapItems(items: z.infer<typeof itemSchema>[]): ExtractedFoodItem[] {
  return items.map((item) => ({
    foodName: item.food_name,
    mealType: item.meal_type,
    quantity: item.quantity,
    unit: item.unit,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
    sugar: item.sugar,
    sodium: item.sodium,
    vitamins: item.vitamins,
    minerals: item.minerals,
  }));
}

/** Parse JSON from an LLM reply, tolerating markdown fences. */
export function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  }
}
