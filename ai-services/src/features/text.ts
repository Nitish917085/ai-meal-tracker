import { config, isAiConfigured } from '../config';
import { chatCompletion } from '../llm/client';
import { mapItems, parseJson, responseSchema } from './schemas';
import type { ExtractionResult } from './types';

const TEXT_SYSTEM_PROMPT = `You are a nutrition data extraction assistant. The user will paste raw text from a file (food diary, CSV, nutrition log, receipt, or freeform notes).

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "items": [
    {
      "food_name": "string",
      "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
      "quantity": number,
      "unit": "string",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "sugar": number (grams),
      "sodium": number (mg),
      "vitamins": {},
      "minerals": {}
    }
  ]
}

Rules:
- Extract every food item you can find in the text.
- Infer meal_type from context (e.g. words like breakfast/lunch/dinner/snack) — default to "snack".
- Parse numbers from tables/CSV correctly; ignore unrelated figures (dates, page numbers).
- If a food item has no nutrition data, use 0 for those fields rather than omitting.
- Preserve the food name as written.`;

/**
 * Extract nutrition entries from arbitrary text (CSV, food diary, logs, etc.)
 * using the LLM. Returns an empty list (not a fallback) when AI isn't configured,
 * so callers can fall back to deterministic parsing themselves.
 */
export async function extractNutritionFromText(text: string): Promise<ExtractionResult> {
  if (!isAiConfigured()) {
    return { items: [], source: 'fallback' };
  }

  const response = await chatCompletion({
    model: config.openai.model,
    jsonMode: true,
    temperature: 0,
    messages: [
      { role: 'system', content: TEXT_SYSTEM_PROMPT },
      { role: 'user', content: text.slice(0, 24_000) },
    ],
  });

  const parsed = responseSchema.safeParse(parseJson(response.message.content ?? '{}'));

  if (!parsed.success) {
    throw new Error('AI returned an unexpected structure for nutrition data');
  }

  return { items: mapItems(parsed.data.items), source: 'ai' };
}
