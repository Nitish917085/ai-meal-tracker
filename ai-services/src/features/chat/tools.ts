import { z } from 'zod';
import type { ToolDefinition } from '../../llm/client';
import { buildQuery, calorieFetch } from './calorieClient';

export interface ChatTool {
  definition: ToolDefinition;
  run: (token: string, args: Record<string, unknown>) => Promise<unknown>;
}

const mealInputSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foodName: z.string().min(1),
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
  consumedAt: z.string().optional(),
});

const goalInputSchema = z.object({
  calorieTarget: z.number().positive(),
  proteinTarget: z.number().nonnegative().default(0),
  carbTarget: z.number().nonnegative().default(0),
  fatTarget: z.number().nonnegative().default(0),
  currentWeight: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  weightGoal: z.string().optional(),
});

/**
 * Coerce a model-provided date into strict YYYY-MM-DD. Free models often emit
 * ISO datetimes (`2026-08-30T00:00:00Z`), single-digit parts (`2026-9-5`), or
 * extra whitespace — all of which the calorie service's `assertDate` rejects
 * with a 400. Normalizing here keeps those tool calls from failing.
 */
function normalizeDate(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return undefined;
}

/**
 * Normalize a model-provided date range and repair an inverted range (start
 * after end) so the calorie service never rejects a well-intentioned window.
 */
function normalizeRange(args: { startDate?: string; endDate?: string }): {
  start?: string;
  end?: string;
} {
  const start = normalizeDate(args.startDate);
  const end = normalizeDate(args.endDate);
  if (start && end && start > end) {
    return { start: end, end: start };
  }
  return { start, end };
}

export const tools: ChatTool[] = [
  {
    definition: {
      type: 'function',
      function: {
        name: 'log_meal',
        description: 'Log a single food entry for the user. Includes meal type, quantity and nutrition values.',
        parameters: {
          type: 'object',
          properties: {
            mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
            foodName: { type: 'string' },
            quantity: { type: 'number' },
            unit: { type: 'string' },
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            fiber: { type: 'number' },
            sugar: { type: 'number' },
            sodium: { type: 'number' },
            vitamins: { type: 'object', additionalProperties: { type: 'number' } },
            minerals: { type: 'object', additionalProperties: { type: 'number' } },
            consumedAt: { type: 'string', description: 'ISO datetime, optional' },
          },
          required: ['mealType', 'foodName', 'calories'],
        },
      },
    },
    run: async (token, args) => {
      const input = mealInputSchema.parse(args);
      const meal = await calorieFetch(token, '/meals', {
        method: 'POST',
        body: JSON.stringify({ ...input, consumedAt: input.consumedAt ?? new Date().toISOString() }),
      });
      return { id: meal.id, foodName: meal.foodName, calories: meal.calories };
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'list_meals',
        description: 'List the user\'s food entries, optionally filtered by date range and meal type. If the user asks about "today", "last N days", "this week", etc., compute startDate and endDate using today\'s date (given in the system prompt).',
        parameters: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
            mealType: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
          },
        },
      },
    },
    run: async (token, args) => {
      const { start, end } = normalizeRange(args);
      const mealType = args.mealType as string | undefined;
      const query = buildQuery({ start, end, mealType, pageSize: 50 });
      const result = await calorieFetch(token, `/meals${query}`);
      return {
        count: result.pagination.total,
        items: result.data.map((m: any) => ({
          id: m.id,
          date: m.consumedAt.slice(0, 10),
          mealType: m.mealType,
          foodName: m.foodName,
          calories: m.calories,
        })),
      };
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_goals',
        description: 'Get the user\'s current active nutrition and weight goals.',
        parameters: { type: 'object', properties: {} },
      },
    },
    run: async (token) => {
      const result = await calorieFetch(token, '/goals');
      return result.active ?? { message: 'No goals set yet' };
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'set_goal',
        description: 'Create or update the user\'s daily calorie and macro targets (and optional weight goal).',
        parameters: {
          type: 'object',
          properties: {
            calorieTarget: { type: 'number' },
            proteinTarget: { type: 'number' },
            carbTarget: { type: 'number' },
            fatTarget: { type: 'number' },
            currentWeight: { type: 'number' },
            targetWeight: { type: 'number' },
            weightGoal: { type: 'string' },
          },
          required: ['calorieTarget'],
        },
      },
    },
    run: async (token, args) => {
      const input = goalInputSchema.parse(args);
      return calorieFetch(token, '/goals', { method: 'POST', body: JSON.stringify(input) });
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_daily_summary',
        description: 'Get daily calorie/macro totals for a date range. If the user asks about "today", "last N days", "this week", etc., compute startDate and endDate using today\'s date (given in the system prompt). Defaults to the last 7 days if no dates are given.',
        parameters: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
          },
        },
      },
    },
    run: async (token, args) => {
      const { start, end } = normalizeRange(args);
      const query = buildQuery({ start, end });
      return calorieFetch(token, `/reports/daily${query}`);
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'get_goal_comparison',
        description: 'Compare the user\'s actual intake against their goals for a date range. Compute startDate and endDate using today\'s date (given in the system prompt) for relative queries.',
        parameters: {
          type: 'object',
          properties: {
            startDate: { type: 'string', description: 'YYYY-MM-DD' },
            endDate: { type: 'string', description: 'YYYY-MM-DD' },
          },
        },
      },
    },
    run: async (token, args) => {
      const { start, end } = normalizeRange(args);
      const query = buildQuery({ start, end });
      return calorieFetch(token, `/reports/goal-comparison${query}`);
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'save_memory',
        description:
          'Remember a durable fact or preference about the user (name, dietary preferences, food likes/dislikes, allergies, fitness goals, etc.) so it can be recalled in future conversations.',
        parameters: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'A concise, self-contained fact about the user.' },
          },
          required: ['content'],
        },
      },
    },
    run: async (token, args) => {
      const content = typeof args.content === 'string' ? args.content.trim() : '';
      if (!content) throw new Error('Memory content is required');
      return calorieFetch(token, '/memory', { method: 'POST', body: JSON.stringify({ content }) });
    },
  },
  {
    definition: {
      type: 'function',
      function: {
        name: 'forget_memory',
        description: 'Remove a previously saved memory that is no longer accurate or relevant.',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'The memory id to delete.' },
          },
          required: ['id'],
        },
      },
    },
    run: async (token, args) => {
      const id = Number(args.id);
      if (!Number.isInteger(id)) throw new Error('A valid memory id is required');
      return calorieFetch(token, `/memory/${id}`, { method: 'DELETE' });
    },
  },
];
