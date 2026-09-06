import { badRequest } from './httpError';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INDIA_TIME_ZONE = 'Asia/Kolkata';

/** Return a date's YYYY-MM-DD representation in India Standard Time. */
function indiaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: INDIA_TIME_ZONE }).format(date);
}

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
  const endDate = end ? assertDate(end) : indiaDateKey(new Date());
  const startDate = start ? assertDate(start) : addDays(endDate, -(defaultDays - 1));

  if (startDate > endDate) {
    throw badRequest('start date must be before or equal to end date');
  }
  return { start: startDate, end: endDate };
}

function addDays(date: string, days: number): string {
  const copy = new Date(`${date}T00:00:00Z`);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy.toISOString().slice(0, 10);
}

/** Human-friendly today in India Standard Time. Timestamps remain UTC. */
export function todayISO(): string {
  return indiaDateKey(new Date());
}
