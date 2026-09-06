import { Box, Button, Divider, Skeleton, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';
import type { GoalComparison } from '../../api/reports';
import type { DailyTotals, FoodEntry } from '../../types';
import { LineChart } from '../Charts';
import { TodaySummary } from '../common/TodaySummary';
import { MealTypeIcon } from '../common/MealTypeIcon';
import { formatTime, MEAL_TYPE_LABELS } from '../../utils/format';

/** Desktop sidebar on the Log page: today's numbers, the week trend, and what was eaten today. */
export function OverviewPanel({
  comparison,
  week,
  todayMeals,
  loading,
  onEdit,
}: {
  comparison: GoalComparison | null;
  week: DailyTotals[];
  todayMeals: FoodEntry[];
  loading: boolean;
  onEdit: (meal: FoodEntry) => void;
}) {
  const hasWeek = week.some((d) => d.calories > 0);
  return (
    <Stack spacing={2}>
      <TodaySummary data={comparison} loading={loading} variant="hero" />

      <Box sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Today's meals</Typography>
          <Button component={Link} to="/insights?tab=meals" size="small" endIcon={<ArrowForward fontSize="small" />}>
            All meals
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={96} />
        ) : todayMeals.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Nothing logged yet today.
          </Typography>
        ) : (
          todayMeals.map((meal, i) => (
            <Box key={meal.id}>
              {i > 0 && <Divider />}
              <Box
                role="button"
                tabIndex={0}
                onClick={() => onEdit(meal)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEdit(meal);
                  }
                }}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(10,10,10,0.03)' } }}
              >
                <MealTypeIcon type={meal.mealType} size={32} />
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap fontWeight={500}>
                    {meal.foodName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" component="div" noWrap>
                    {MEAL_TYPE_LABELS[meal.mealType]} · {formatTime(meal.consumedAt)}
                  </Typography>
                </Box>
                <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                  {Math.round(meal.calories)} kcal
                </Typography>
              </Box>
            </Box>
          ))
        )}
      </Box>

      <Box sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2">Last 7 days</Typography>
          <Button component={Link} to="/insights?tab=reports" size="small" endIcon={<ArrowForward fontSize="small" />}>
            Reports
          </Button>
        </Box>
        {loading ? (
          <Skeleton variant="rectangular" height={140} />
        ) : !hasWeek ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            Your trend appears after a few days of logging.
          </Typography>
        ) : (
          <LineChart
            height={150}
            data={week.map((d) => ({
              label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
              value: d.calories,
            }))}
          />
        )}
      </Box>
    </Stack>
  );
}
