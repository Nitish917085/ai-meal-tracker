import { extractNutrition, extractNutritionFromText, type ExtractionResponse } from '../api/ai';
import type { ImportEntry } from '../api/import';
import type { ExtractedFoodItem } from '../types';
import { nowISO } from './format';

export const IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'heic', 'heif']);
export const IMPORT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.md,.csv,.tsv,.json,.log,image/*';

export function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXT.has(extOf(file.name));
}

/** Map AI-extracted items into importable entries dated now. */
export function extractedToEntries(items: ExtractedFoodItem[], consumedAt = nowISO()): ImportEntry[] {
  return items.map((item) => ({ ...item, consumedAt }));
}

/**
 * Universal importer — dispatches by file type:
 *   - PDF / images → vision LLM (uploaded via multer; returns the served URL)
 *   - anything else → read as text, then LLM extraction
 */
export async function fileToEntries(file: File): Promise<{
  entries: ImportEntry[];
  source: ExtractionResponse['source'];
  fileUrl?: string;
  fileName?: string;
}> {
  if (extOf(file.name) === 'pdf' || isImageFile(file)) {
    const res = await extractNutrition(file);
    return { entries: extractedToEntries(res.items), source: res.source, fileUrl: res.file?.url, fileName: file.name };
  }
  const text = await file.text();
  const res = await extractNutritionFromText(text);
  return { entries: extractedToEntries(res.items), source: res.source, fileName: file.name };
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
