import { aiApi } from './client';
import type { ExtractedFoodItem } from '../types';

export interface ExtractionResponse {
  items: ExtractedFoodItem[];
  source: 'ai' | 'fallback';
  file?: { name: string; url: string };
}

export function extractNutrition(file: File): Promise<ExtractionResponse> {
  const form = new FormData();
  form.append('file', file);
  return aiApi.post<ExtractionResponse>('/extract', form);
}

export function extractNutritionFromText(text: string): Promise<ExtractionResponse> {
  return aiApi.post<ExtractionResponse>('/extract-text', { text });
}
