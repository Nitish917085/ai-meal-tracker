import { z } from 'zod';
import { MEAL_TYPES } from './types';

export const registerSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const verifyRegisterSchema = z.object({
  email: z.string().email('A valid email is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const loginSchema = z.object({
  email: z.string().email('A valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const goalSchema = z.object({
  calorieTarget: z.number().positive('Calorie target must be positive'),
  proteinTarget: z.number().nonnegative().default(0),
  carbTarget: z.number().nonnegative().default(0),
  fatTarget: z.number().nonnegative().default(0),
  currentWeight: z.number().positive().nullable().optional(),
  targetWeight: z.number().positive().nullable().optional(),
  weightGoal: z.string().max(200).nullable().optional(),
});

/**
 * Accepts either an ISO datetime or a plain YYYY-MM-DD date and normalizes the
 * latter to noon UTC so date-based grouping behaves consistently.
 */
/**
 * Accepts either an ISO datetime or a plain YYYY-MM-DD date and normalizes the
 * latter to noon India time so date-based grouping behaves consistently for
 * users working in Asia/Kolkata.
 */
const consumedAtSchema = z
  .string()
  .min(1)
  .refine(
    (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isNaN(Date.parse(value)),
    'consumedAt must be a valid date or ISO datetime',
  )
  .transform((value) =>
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T06:30:00.000Z` : new Date(value).toISOString(),
  );

export const mealSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  foodName: z.string().min(1).max(200),
  quantity: z.number().positive().default(1),
  unit: z.string().max(50).default('serving'),
  calories: z.number().nonnegative().default(0),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
  fiber: z.number().nonnegative().default(0),
  sugar: z.number().nonnegative().default(0),
  sodium: z.number().nonnegative().default(0),
  vitamins: z.record(z.string(), z.number()).default({}),
  minerals: z.record(z.string(), z.number()).default({}),
  consumedAt: consumedAtSchema.default(() => new Date().toISOString()),
});

export const mealListQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  mealType: z.enum(MEAL_TYPES).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
});

export const reportQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

/** Entries produced by the frontend importer (AI-extracted or PDF/text). */
export const importEntrySchema = z.object({
  foodName: z.string().min(1).max(200),
  mealType: z.enum(MEAL_TYPES),
  quantity: z.number().positive().default(1),
  unit: z.string().max(50).default('serving'),
  calories: z.number().nonnegative().default(0),
  protein: z.number().nonnegative().default(0),
  carbs: z.number().nonnegative().default(0),
  fat: z.number().nonnegative().default(0),
  fiber: z.number().nonnegative().default(0),
  sugar: z.number().nonnegative().default(0),
  sodium: z.number().nonnegative().default(0),
  vitamins: z.record(z.string(), z.number()).default({}),
  minerals: z.record(z.string(), z.number()).default({}),
  consumedAt: consumedAtSchema.default(() => new Date().toISOString()),
});

export const importSchema = z.object({
  entries: z.array(importEntrySchema).min(1).max(500),
});

export const sendOtpSchema = z.object({
  email: z.string().email('A valid email is required'),
});

export const verifyOtpSchema = z.object({
  email: z.string().email('A valid email is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('A valid email is required'),
  // OTP is only required when full auth is enabled; the service re-checks it.
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits').optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const memorySchema = z.object({
  content: z.string().min(1, 'Memory content is required').max(2000),
});

export const chatHistoryAppendSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
        imageUrl: z.string().max(1000).nullable().optional(),
        fileName: z.string().max(255).nullable().optional(),
      }),
    )
    .min(1)
    .max(100),
});
