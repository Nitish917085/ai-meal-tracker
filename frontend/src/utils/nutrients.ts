/**
 * Canonical nutrient definitions used by the meal form's vitamins/minerals
 * editor and by the micronutrient display helpers.
 */

export interface Nutrient {
  /** Storage key, e.g. "vitamin_c" or "potassium". */
  key: string;
  /** Human-readable label shown in the dropdown, e.g. "Vitamin C". */
  label: string;
  /** Conventional unit of measure. */
  unit: 'mg' | 'µg';
}

export const VITAMINS: Nutrient[] = [
  { key: 'vitamin_a', label: 'Vitamin A', unit: 'µg' },
  { key: 'vitamin_b1', label: 'Vitamin B1 (Thiamin)', unit: 'mg' },
  { key: 'vitamin_b2', label: 'Vitamin B2 (Riboflavin)', unit: 'mg' },
  { key: 'vitamin_b3', label: 'Vitamin B3 (Niacin)', unit: 'mg' },
  { key: 'vitamin_b6', label: 'Vitamin B6', unit: 'mg' },
  { key: 'vitamin_b12', label: 'Vitamin B12', unit: 'µg' },
  { key: 'vitamin_c', label: 'Vitamin C', unit: 'mg' },
  { key: 'vitamin_d', label: 'Vitamin D', unit: 'µg' },
  { key: 'vitamin_e', label: 'Vitamin E', unit: 'mg' },
  { key: 'vitamin_k', label: 'Vitamin K', unit: 'µg' },
  { key: 'folate', label: 'Folate (Vitamin B9)', unit: 'µg' },
  { key: 'biotin', label: 'Biotin (Vitamin B7)', unit: 'µg' },
  { key: 'pantothenic_acid', label: 'Pantothenic Acid (Vitamin B5)', unit: 'mg' },
];

export const MINERALS: Nutrient[] = [
  { key: 'calcium', label: 'Calcium', unit: 'mg' },
  { key: 'iron', label: 'Iron', unit: 'mg' },
  { key: 'magnesium', label: 'Magnesium', unit: 'mg' },
  { key: 'phosphorus', label: 'Phosphorus', unit: 'mg' },
  { key: 'potassium', label: 'Potassium', unit: 'mg' },
  { key: 'zinc', label: 'Zinc', unit: 'mg' },
  { key: 'copper', label: 'Copper', unit: 'mg' },
  { key: 'manganese', label: 'Manganese', unit: 'mg' },
  { key: 'selenium', label: 'Selenium', unit: 'µg' },
  { key: 'iodine', label: 'Iodine', unit: 'µg' },
  { key: 'chromium', label: 'Chromium', unit: 'µg' },
  { key: 'molybdenum', label: 'Molybdenum', unit: 'µg' },
];

const NUTRIENT_MAP: Record<string, Nutrient> = Object.fromEntries(
  [...VITAMINS, ...MINERALS].map((n) => [n.key, n]),
);

/** Keys the AI extractor may emit that are conventionally reported in micrograms. */
const MICROGRAM_FALLBACK = new Set([
  'vitamin_a', 'vitamin_d', 'vitamin_k', 'vitamin_b12', 'folate', 'folic_acid',
  'biotin', 'selenium', 'iodine', 'chromium', 'molybdenum',
]);

/** Best-effort label for an unknown key, e.g. "vitamin_b5" → "Vitamin B5". */
function titleCase(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bB(\d+)\b/g, 'B$1');
}

/** Look up a nutrient's display label, falling back to a generated title-case label. */
export function nutrientLabel(key: string): string {
  return NUTRIENT_MAP[key]?.label ?? titleCase(key);
}

/** Look up a nutrient's unit, defaulting to µg for known microgram nutrients. */
export function nutrientUnit(key: string): 'mg' | 'µg' {
  return NUTRIENT_MAP[key]?.unit ?? (MICROGRAM_FALLBACK.has(key.toLowerCase()) ? 'µg' : 'mg');
}
