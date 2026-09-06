import { config } from '../../config';
import { HttpError } from '../../server/middleware/httpError';

/** Call the calorie service's REST API on the user's behalf. */
export async function calorieFetch(
  token: string,
  path: string,
  init: { method?: string; body?: string } = {},
): Promise<any> {
  const response = await fetch(`${config.calorieServiceUrl}/api${path}`, {
    method: init.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: init.body,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Calorie service error (${response.status})`;
    throw new HttpError(response.status, message);
  }
  return data;
}

export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
