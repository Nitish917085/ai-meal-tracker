/**
 * Round a number to a sensible precision to avoid floating point noise in
 * nutrition totals (e.g. 0.1 + 0.2 -> 0.3 instead of 0.30000000000000004).
 */
export function round(value: number, precision = 1): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function sum(nums: number[]): number {
  return nums.reduce((acc, n) => acc + n, 0);
}

/**
 * Merge several micronutrient maps into one, summing shared keys.
 */
export function mergeMicros(maps: Record<string, number>[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      if (typeof value !== 'number' || Number.isNaN(value)) continue;
      result[key] = round((result[key] ?? 0) + value);
    }
  }
  return result;
}
