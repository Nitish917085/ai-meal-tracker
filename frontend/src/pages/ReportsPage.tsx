import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from '@mui/material';
import { getDailyTotals, getGoalComparison, getMacros, getMicronutrients, type GoalComparison } from '../api/reports';
import type { DailyTotals, MacroTotals, Micronutrients } from '../types';
import { DonutChart, GoalProgressBars, LineChart, StackedBarChart } from '../components/Charts';
import { PageHeader } from '../components/common/PageHeader';
import { chartAccentColor, macroColors } from '../theme';
import { daysBetweenInclusive, micronutrientLabel, micronutrientUnit } from '../utils/format';
import { DateRangeFilter, rangeForPreset, type DateRange, type RangePreset } from '../components/common/DateRangeFilter';

export function ReportsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('7d'));
  const { start, end } = range;

  const [daily, setDaily] = useState<DailyTotals[]>([]);
  const [totals, setTotals] = useState<MacroTotals | null>(null);
  const [micros, setMicros] = useState<{ vitamins: Micronutrients; minerals: Micronutrients } | null>(null);
  const [comparison, setComparison] = useState<GoalComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [initial, setInitial] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const days = daysBetweenInclusive(start, end);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      getMacros({ start, end }),
      getMicronutrients({ start, end }),
      getGoalComparison({ start, end }),
      getDailyTotals({ start, end }),
    ])
      .then(([macrosRes, microsRes, comparisonRes, dailyRes]) => {
        if (cancelled) return;
        setTotals(macrosRes.totals);
        setMicros(microsRes);
        setComparison(comparisonRes);
        setDaily(dailyRes.data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setInitial(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [start, end]);

  const macros = totals ?? { protein: 0, carbs: 0, fat: 0, calories: 0 };
  const hasData = macros.calories > 0 || daily.some((d) => d.calories > 0);
  const emptyNote = (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography variant="body2" color="text.secondary">
        No meals logged in this range.
      </Typography>
    </Box>
  );
  const goal = comparison?.goal;
  const avg = (v: number) => v / days;

  const donutSegments = [
    { label: 'Protein', value: macros.protein, color: macroColors.protein },
    { label: 'Carbs', value: macros.carbs, color: macroColors.carbs },
    { label: 'Fat', value: macros.fat, color: macroColors.fat },
  ];

  const rangeLabel = `${days}-day`;

  return (
    <Stack spacing={3} sx={embedded ? { flexGrow: 1, minHeight: 0 } : undefined}>
      {!embedded && <PageHeader title="Nutrition reports" subtitle="Trends and breakdowns over your selected range" />}

      {error && <Alert severity="error">{error}</Alert>}

      <Box sx={{ flexShrink: 0 }}>
        <DateRangeFilter preset={preset} onPresetChange={setPreset} value={range} onChange={setRange} />
      </Box>

      {/* Keep the previous charts visible while new data loads; show a thin progress bar instead of a spinner. */}
      <Box sx={{ position: 'relative', ...(embedded ? { flexGrow: 1, minHeight: 0, overflowY: 'auto' } : {}) }}>
        {loading && !initial && (
          <LinearProgress sx={{ position: 'absolute', top: -12, left: 0, right: 0, height: 2 }} />
        )}
        <Stack spacing={3} useFlexGap sx={{ opacity: loading && !initial ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, columnGap: 2, rowGap: 0.5 }}>
                <Typography variant="subtitle1">{rangeLabel} calorie intake</Typography>
                {!initial && (
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                    avg <strong>{Math.round(avg(macros.calories))}</strong> kcal/day
                  </Typography>
                )}
              </Box>
              {initial ? (
                <Skeleton variant="rectangular" height={200} />
              ) : !hasData ? (
                emptyNote
              ) : (
                <LineChart
                  data={daily.map((d) => ({
                    label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                    value: d.calories,
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Macros per day
              </Typography>
              {initial ? (
                <Skeleton variant="rectangular" height={200} />
              ) : !hasData ? (
                emptyNote
              ) : (
                <>
                  <StackedBarChart
                    data={daily.map((d) => ({
                      label: new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                      protein: d.protein,
                      carbs: d.carbs,
                      fat: d.fat,
                    }))}
                  />
                  <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                    {[
                      { label: 'Protein', color: macroColors.protein },
                      { label: 'Carbs', color: macroColors.carbs },
                      { label: 'Fat', color: macroColors.fat },
                    ].map((x) => (
                      <Stack key={x.label} direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 10, height: 10, bgcolor: x.color }} />
                        <Typography variant="caption" color="text.secondary">
                          {x.label}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </>
              )}
            </CardContent>
          </Card>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="subtitle1" sx={{ mb: 2 }}>
                    Macronutrient breakdown
                  </Typography>
                  {initial ? (
                    <Skeleton variant="circular" width={160} height={160} />
                  ) : !hasData ? (
                    emptyNote
                  ) : (
                    <DonutChart
                      segments={donutSegments}
                      centerLabel={String(Math.round(macros.calories))}
                      centerCaption="kcal total"
                    />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 2, gap: 2 }}>
                    <Typography variant="subtitle1">Daily average vs. goal</Typography>
                  </Box>
                  {initial ? (
                    <Skeleton variant="rectangular" height={160} />
                  ) : !hasData ? (
                    emptyNote
                  ) : goal ? (
                    <>
                      <GoalProgressBars
                        data={[
                          { label: 'Calories', value: avg(macros.calories), target: goal.calories, color: chartAccentColor, unit: 'kcal' },
                          { label: 'Protein', value: avg(macros.protein), target: goal.protein, color: macroColors.protein, unit: 'g' },
                          { label: 'Carbs', value: avg(macros.carbs), target: goal.carbs, color: macroColors.carbs, unit: 'g' },
                          { label: 'Fat', value: avg(macros.fat), target: goal.fat, color: macroColors.fat, unit: 'g' },
                        ]}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                        Averages over {days} day{days === 1 ? '' : 's'}. A black marker means the goal was exceeded.
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Set a goal to compare your intake against daily targets.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Micronutrient summary
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <MicronutrientList title="Vitamins" data={micros?.vitamins ?? {}} loading={initial} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <MicronutrientList title="Minerals" data={micros?.minerals ?? {}} loading={initial} />
                </Grid>
              </Grid>
              {!initial && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                  Totals over the selected range.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Stack>
      </Box>
    </Stack>
  );
}

function MicronutrientList({ title, data, loading }: { title: string; data: Micronutrients; loading: boolean }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <Box sx={{ maxWidth: 360 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {loading ? (
        <Skeleton variant="rectangular" height={80} />
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No {title.toLowerCase()} data in range.
        </Typography>
      ) : (
        <Table size="small" sx={{ '& td': { px: 0, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' } }}>
          <TableBody>
            {rows.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell>
                  <Typography variant="body2">{micronutrientLabel(key)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                    {Math.round(value)} {micronutrientUnit(key)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}
