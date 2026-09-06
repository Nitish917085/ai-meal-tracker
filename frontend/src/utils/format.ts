import type { MealType } from '../types';
import { nutrientLabel, nutrientUnit } from './nutrients';

export const APP_TIME_ZONE = 'Asia/Kolkata';

export function dateKeyInAppTimeZone(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE }).format(date);
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const MEAL_TYPE_EMOJI: Record<MealType, string> = {
  breakfast: '🍳',
  lunch: '🥪',
  dinner: '🍲',
  snack: '🍎',
};

/** Format an ISO datetime into a short "Sep 5, 2026" style date. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { timeZone: APP_TIME_ZONE, month: 'short', day: 'numeric', year: 'numeric' });
}

/** Format an ISO datetime into a compact time (e.g. "8:30 AM"). */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, { timeZone: APP_TIME_ZONE, hour: 'numeric', minute: '2-digit' });
}

/** Today's date as YYYY-MM-DD in India Standard Time. */
export function todayISO(): string {
  return dateKeyInAppTimeZone(new Date());
}

/** Shift a YYYY-MM-DD date by N days. */
export function shiftDate(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Unit for a micronutrient key (e.g. "vitamin_d" → "µg", "calcium" → "mg"). */
export function micronutrientUnit(key: string): string {
  return nutrientUnit(key);
}

/** "vitamin_b12" → "Vitamin B12". */
export function micronutrientLabel(key: string): string {
  return nutrientLabel(key);
}

/** Compact "Vitamin C 12 mg · Iron 4 mg" for a meal's vitamins + minerals (empty if none). */
export function formatMicros(
  vitamins: Record<string, number> | undefined,
  minerals: Record<string, number> | undefined,
): string {
  const micros = { ...(vitamins ?? {}), ...(minerals ?? {}) };
  return Object.entries(micros)
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${micronutrientLabel(k)} ${Math.round(v)} ${micronutrientUnit(k)}`)
    .join(' · ');
}

/** Number of calendar days between two YYYY-MM-DD dates, inclusive (min 1). */
export function daysBetweenInclusive(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 1;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
}

/** "Sep 6, 2026" for today → "Today", yesterday → "Yesterday", otherwise the date. */
export function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = dateKeyInAppTimeZone(d);
  const today = todayISO();
  if (day === today) return 'Today';
  if (day === shiftDate(today, -1)) return 'Yesterday';
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return d.toLocaleDateString(undefined, { timeZone: APP_TIME_ZONE, ...(sameYear
    ? { weekday: 'short', month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' }) });
}

/** Local ISO string for "now", rounded down to the minute. */
export function nowISO(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString();
}
