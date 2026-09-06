import { useCallback, useEffect, useState } from 'react';
import { getDailyTotals, getGoalComparison, type GoalComparison } from '../api/reports';
import { listMeals } from '../api/meals';
import type { DailyTotals, FoodEntry } from '../types';
import { shiftDate, todayISO } from '../utils/format';

/** Today's goal comparison, the 7-day trend and today's meals; refreshes whenever a meal is saved. */
export function useTodayOverview() {
  const [comparison, setComparison] = useState<GoalComparison | null>(null);
  const [week, setWeek] = useState<DailyTotals[]>([]);
  const [todayMeals, setTodayMeals] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const today = todayISO();
    Promise.all([
      getGoalComparison({ start: today, end: today }),
      getDailyTotals({ start: shiftDate(today, -6), end: today }),
      listMeals({ start: today, end: today, pageSize: 10 }),
    ])
      .then(([cmp, daily, meals]) => {
        setComparison(cmp);
        setWeek(daily.data);
        setTodayMeals(meals.data);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('caloriepal:meal-saved', refresh);
    return () => window.removeEventListener('caloriepal:meal-saved', refresh);
  }, [refresh]);

  return { comparison, week, todayMeals, loading, refresh };
}
