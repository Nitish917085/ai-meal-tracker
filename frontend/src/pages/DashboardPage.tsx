import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { getDailyTotals, getGoalComparison, type GoalComparison } from '../api/reports';
import { listMeals } from '../api/meals';
import type { DailyTotals, FoodEntry } from '../types';
import { LineChart } from '../components/Charts';
import { MealTypeIcon } from '../components/common/MealTypeIcon';
import { PageHeader } from '../components/common/PageHeader';
import { TodaySummary } from '../components/common/TodaySummary';
import { formatRelativeDate, formatTime, MEAL_TYPE_LABELS, shiftDate, todayISO } from '../utils/format';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { user } = useAuth();
  const [comparison, setComparison] = useState<GoalComparison | null>(null);
  const [week, setWeek] = useState<DailyTotals[]>([]);
  const [recent, setRecent] = useState<FoodEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const today = todayISO();

  const load = useCallback(() => {
    let cancelled = false;
    Promise.all([
      getGoalComparison({ start: today, end: today }),
      getDailyTotals({ start: shiftDate(today, -6), end: today }),
      listMeals({ pageSize: 5 }),
    ])
      .then(([comparisonRes, dailyRes, mealsRes]) => {
        if (cancelled) return;
        setComparison(comparisonRes);
        setWeek(dailyRes.data);
        setRecent(mealsRes.data);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [today]);

  useEffect(() => {
    const cancel = load();
    const handler = () => load();
    window.addEventListener('caloriepal:meal-saved', handler);
    return () => {
      cancel();
      window.removeEventListener('caloriepal:meal-saved', handler);
    };
  }, [load]);

  const goal = comparison?.goal;
  const targetCalories = goal?.calories ?? 2000;
  const firstName = user?.name?.split(' ')[0];

  const loggedDays = week.filter((d) => d.calories > 0);
  const avgKcal = loggedDays.length ? Math.round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length) : 0;
  const best = loggedDays.reduce<DailyTotals | null>((b, d) => (b == null || d.calories > b.calories ? d : b), null);
  const onTarget = loggedDays.filter((d) => d.calories <= targetCalories).length;
  const weekStats: Array<[string, string]> = [
    ['Avg / day', `${avgKcal} kcal`],
    ['Highest day', best ? `${new Date(`${best.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' })} · ${Math.round(best.calories)}` : '—'],
    ['Days on target', `${onTarget} / ${loggedDays.length}`],
  ];

  return (
    <Stack spacing={3} useFlexGap>
      {!embedded && <PageHeader title={`${greeting()}${firstName ? `, ${firstName}` : ''}`} subtitle="Here's your nutrition today" />}

      {error && <Alert severity="error">{error}</Alert>}

      <TodaySummary data={comparison} loading={loading} variant="hero" />

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Last 7 days
              </Typography>
              {loading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : !week.some((d) => d.calories > 0) ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Nothing logged in the last 7 days. Your trend will appear here.
                  </Typography>
                </Box>
              ) : (
                <>
                  <LineChart
                    data={week.map((d) => ({
                      label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
                      value: d.calories,
                    }))}
                  />
                  <Grid container spacing={2} sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
                    {weekStats.map(([label, value]) => (
                      <Grid item xs={4} key={label}>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {label}
                        </Typography>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {value}
                        </Typography>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Recent meals</Typography>
                <Button component={Link} to="/insights?tab=meals" size="small" endIcon={<ArrowForward fontSize="small" />}>
                  View all
                </Button>
              </Box>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 1.25 }}>
                    <Skeleton variant="rectangular" width={36} height={36} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Skeleton width="60%" />
                      <Skeleton width="40%" />
                    </Box>
                  </Box>
                ))
              ) : recent.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    No meals logged yet.
                  </Typography>
                  <Button size="small" variant="outlined" component={Link} to="/">
                    Log your first meal
                  </Button>
                </Box>
              ) : (
                recent.map((meal, i) => (
                  <Box key={meal.id}>
                    {i > 0 && <Divider />}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25 }}>
                      <MealTypeIcon type={meal.mealType} size={36} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body2" noWrap fontWeight={500}>
                          {meal.foodName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                          {MEAL_TYPE_LABELS[meal.mealType]} · {formatRelativeDate(meal.consumedAt)} · {formatTime(meal.consumedAt)}
                        </Typography>
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                        {Math.round(meal.calories)} kcal
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}
