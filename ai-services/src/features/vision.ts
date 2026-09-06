import fs from 'node:fs';
import { isAiConfigured } from '../config';
import { chatCompletion, type ContentPart } from '../llm/client';
import { resolveVisionModelCandidates } from '../llm/models';
import { runWithModelFallback } from '../llm/fallback';
import { mapItems, parseJson, responseSchema } from './schemas';
import type { ExtractedFoodItem, ExtractionResult } from './types';

const SYSTEM_PROMPT = `You are a nutrition analysis assistant. Analyze the provided file or image: a food item, a plate of food, a nutrition facts label, or a food diary document (PDF, CSV, receipt, or notes).

Return ONLY a JSON object (no markdown, no commentary) with this exact shape:
{
  "items": [
    {
      "food_name": "string",
      "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
      "quantity": number,
      "unit": "string (e.g. serving, grams, cup, piece)",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "sugar": number (grams),
      "sodium": number (mg),
      "vitamins": { "vitamin_c": number, ... },
      "minerals": { "iron": number, "calcium": number, ... }
    }
  ]
}

Rules:
- If the file is a nutrition label, read the values directly (per serving).
- If the file is a photo of food, estimate the components and their nutrition.
- If the file is a document (PDF/text), extract every food item it contains.
- Use grams for macros. If a value is unknown, estimate a reasonable value rather than omitting it.
- Never invent a food_name if the content is unclear; describe what you see.
- Return one object per distinct food item.`;

/** Build the multimodal content part for a file based on its MIME type. */
function fileContentPart(mimeType: string, base64: string, filename: string): ContentPart {
  if (mimeType === 'application/pdf') {
    return {
      type: 'file',
      file: { filename, file_data: `data:application/pdf;base64,${base64}` },
    };
  }
  return { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}`, detail: 'high' } };
}

/**
 * Read an uploaded file and extract nutrition via a vision model. The route
 * layer (multer) writes the file; this service reads it back. Images are sent
 * as `image_url`; PDFs are sent as a `file` (OpenRouter parses it server-side).
 */
export async function extractNutritionFromFile(
  filePath: string,
  mimeType: string,
  filename?: string,
): Promise<ExtractionResult> {
  const base64 = fs.readFileSync(filePath).toString('base64');
  return extractNutrition(fileContentPart(mimeType, base64, filename ?? 'upload'));
}

async function extractNutrition(part: ContentPart): Promise<ExtractionResult> {
  if (!isAiConfigured()) {
    return { items: [fallbackItem()], source: 'fallback' };
  }

  const candidates = await resolveVisionModelCandidates();

  return runWithModelFallback(candidates, async (model) => {
    const response = await chatCompletion({
      model,
      jsonMode: true,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the nutrition information from this file.' },
            part,
          ],
        },
      ],
    });

    const parsed = responseSchema.safeParse(parseJson(response.message.content ?? '{}'));
    return parsed.success ? { items: mapItems(parsed.data.items), source: 'ai' as const } : null;
  });
}

/** Deterministic demo item used when no AI key is configured. */
function fallbackItem(): ExtractedFoodItem {
  return {
    foodName: 'Sample food item (AI not configured)',
    mealType: 'snack',
    quantity: 1,
    unit: 'serving',
    calories: 250,
    protein: 8,
    carbs: 30,
    fat: 10,
    fiber: 3,
    sugar: 12,
    sodium: 180,
    vitamins: { vitamin_c: 4, vitamin_a: 2 },
    minerals: { calcium: 60, iron: 1.2 },
  };
}
