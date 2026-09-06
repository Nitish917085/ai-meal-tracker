const KEY = 'caloriepal_onboarded';

/** Whether the user has already completed (or skipped) first-run onboarding. */
export function isOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** Mark the first-run onboarding as complete so it isn't shown again. */
export function markOnboarded(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* ignore */
  }
}
