import { badRequest } from './httpError';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate a YYYY-MM-DD string, throwing a 400 on failure. */
export function assertDate(value: string, label = 'date'): string {
  if (!DATE_RE.test(value)) {
    throw badRequest(`${label} must be in YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw badRequest(`${label} is not a valid calendar date`);
  }
  return value;
}

/** Inclusive date range. Throws if the range is inverted or too large. */
export function parseDateRange(
  start?: string,
  end?: string,
  defaultDays = 30,
): { start: string; end: string } {
  const endDate = end ? assertDate(end) : toISO(new Date());
  const startDate = start ? assertDate(start) : toISO(addDays(new Date(endDate), -(defaultDays - 1)));

  if (startDate > endDate) {
    throw badRequest('start date must be before or equal to end date');
  }
  return { start: startDate, end: endDate };
}

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** Human friendly "today" in UTC (used as a default consumed date). */
export function todayISO(): string {
  return new Date().toISOString();
}
