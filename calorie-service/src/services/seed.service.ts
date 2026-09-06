import * as mealService from './meal.service';
import * as goalService from './goal.service';
import type { MealType } from '../types';

/** A small catalog of realistic foods with per-serving nutrition. */
interface SampleFood {
  name: string;
  mealType: MealType;
  unit: string;
  quantity: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

const FOODS: SampleFood[] = [
  // Breakfast
  { name: 'Oatmeal with banana', mealType: 'breakfast', unit: 'bowl', quantity: 1, calories: 320, protein: 8, carbs: 60, fat: 6, fiber: 7, sugar: 16, sodium: 120 },
  { name: 'Scrambled eggs & toast', mealType: 'breakfast', unit: 'serving', quantity: 1, calories: 350, protein: 18, carbs: 30, fat: 18, fiber: 3, sugar: 3, sodium: 480 },
  { name: 'Greek yogurt & granola', mealType: 'breakfast', unit: 'cup', quantity: 1, calories: 290, protein: 16, carbs: 40, fat: 7, fiber: 4, sugar: 18, sodium: 90 },
  { name: 'Smoothie (berry & spinach)', mealType: 'breakfast', unit: 'glass', quantity: 1, calories: 210, protein: 6, carbs: 42, fat: 3, fiber: 6, sugar: 28, sodium: 60 },
  // Lunch
  { name: 'Grilled chicken salad', mealType: 'lunch', unit: 'bowl', quantity: 1, calories: 420, protein: 34, carbs: 22, fat: 22, fiber: 6, sugar: 7, sodium: 620 },
  { name: 'Turkey sandwich', mealType: 'lunch', unit: 'sandwich', quantity: 1, calories: 450, protein: 28, carbs: 48, fat: 16, fiber: 5, sugar: 8, sodium: 980 },
  { name: 'Quinoa & roasted veggies', mealType: 'lunch', unit: 'bowl', quantity: 1, calories: 380, protein: 12, carbs: 58, fat: 12, fiber: 10, sugar: 9, sodium: 340 },
  { name: 'Lentil soup', mealType: 'lunch', unit: 'bowl', quantity: 1, calories: 260, protein: 16, carbs: 40, fat: 4, fiber: 12, sugar: 6, sodium: 720 },
  // Dinner
  { name: 'Salmon & rice', mealType: 'dinner', unit: 'plate', quantity: 1, calories: 560, protein: 36, carbs: 48, fat: 24, fiber: 4, sugar: 3, sodium: 640 },
  { name: 'Chicken stir-fry', mealType: 'dinner', unit: 'plate', quantity: 1, calories: 480, protein: 32, carbs: 44, fat: 18, fiber: 6, sugar: 10, sodium: 850 },
  { name: 'Pasta primavera', mealType: 'dinner', unit: 'plate', quantity: 1, calories: 520, protein: 15, carbs: 82, fat: 14, fiber: 8, sugar: 9, sodium: 560 },
  { name: 'Beef tacos (2)', mealType: 'dinner', unit: 'serving', quantity: 2, calories: 500, protein: 26, carbs: 42, fat: 24, fiber: 6, sugar: 5, sodium: 760 },
  // Snacks
  { name: 'Apple', mealType: 'snack', unit: 'piece', quantity: 1, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, sodium: 2 },
  { name: 'Almonds', mealType: 'snack', unit: 'handful', quantity: 1, calories: 160, protein: 6, carbs: 6, fat: 14, fiber: 3, sugar: 1, sodium: 0 },
  { name: 'Protein shake', mealType: 'snack', unit: 'scoop', quantity: 1, calories: 130, protein: 24, carbs: 4, fat: 2, fiber: 1, sugar: 2, sodium: 160 },
  { name: 'Dark chocolate', mealType: 'snack', unit: 'square', quantity: 2, calories: 120, protein: 2, carbs: 12, fat: 8, fiber: 2, sugar: 8, sodium: 5 },
];

/** Deterministic PRNG (mulberry32) so each user gets stable, reproducible data. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isoAt(dayOffset: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

/** Meal-appropriate clock times for each meal type. */
const MEAL_HOURS: Record<MealType, { hour: number; minute: number }> = {
  breakfast: { hour: 8, minute: 15 },
  lunch: { hour: 13, minute: 0 },
  dinner: { hour: 19, minute: 30 },
  snack: { hour: 16, minute: 0 },
};

export interface SeedResult {
  goal: boolean;
  mealsCreated: number;
  days: number;
}

const DEFAULT_SEED_DAYS = 7;
const SEED_TOTAL_MEALS = 60;

/**
 * Generate realistic demo data for a user: an active goal (if none exists) plus
 * exactly ${SEED_TOTAL_MEALS} meals spread evenly across the last 7 days, cycling
 * through all four meal types so every day has a full breakfast/lunch/snack/dinner
 * spread.
 */
export async function seedUserData(userId: number, days = DEFAULT_SEED_DAYS): Promise<SeedResult> {
  const goal = await goalService.getActiveGoal(userId);
  if (!goal) {
    await goalService.setGoal(userId, {
      calorieTarget: 2000,
      proteinTarget: 120,
      carbTarget: 220,
      fatTarget: 65,
      currentWeight: 72,
      targetWeight: 70,
      weightGoal: 'Lose 2 kg',
    });
  }

  const rand = seededRandom(userId * 7919 + 13);
  const effectiveDays = Math.max(1, days);
  let mealsCreated = 0;

  for (let i = 0; i < SEED_TOTAL_MEALS; i++) {
    // Distribute the 60 entries evenly over the days (last 7 days).
    const day = i % effectiveDays;
    // Cycle through all four meal types so each is represented per day.
    const mealType = MEAL_TYPE_ORDER[i % MEAL_TYPE_ORDER.length];
    const pool = FOODS.filter((f) => f.mealType === mealType);
    const food = pool[Math.floor(rand() * pool.length)];
    const { hour, minute } = MEAL_HOURS[mealType];

    await mealService.createMeal(userId, {
      mealType,
      foodName: food.name,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
      sugar: food.sugar,
      sodium: food.sodium,
      vitamins: { vitamin_c: Math.round(food.calories * 0.02) },
      minerals: { iron: 1.2, calcium: Math.round(food.carbs * 0.3) },
      consumedAt: isoAt(day, hour, minute),
      isSeeded: true,
    });
    mealsCreated++;
  }

  return { goal: !goal, mealsCreated, days: effectiveDays };
}

const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'snack', 'dinner'];
