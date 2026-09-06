import { api } from './client';

export interface SeedResponse {
  goal: boolean;
  mealsCreated: number;
  days: number;
}

export interface ResetResponse {
  deleted: number;
}

export function seedDemoData(days?: number): Promise<SeedResponse> {
  return api.post<SeedResponse>('/seed', days ? { days } : {});
}

export function resetDemoData(): Promise<ResetResponse> {
  return api.del<ResetResponse>('/seed');
}
