import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Pagination,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Add, Delete, Edit, MoreVert } from '@mui/icons-material';
import { deleteMeal, listMeals, type MealFilters } from '../api/meals';
import type { FoodEntry, MealType } from '../types';
import { dateKeyInAppTimeZone, formatRelativeDate, formatTime, formatMicros, MEAL_TYPE_LABELS } from '../utils/format';
import { DateRangeFilter, rangeForPreset, type DateRange, type RangePreset } from '../components/common/DateRangeFilter';
import { MealDialog } from '../components/MealDialog';
import { MealDetailDialog } from '../components/MealDetailDialog';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { MealTypeIcon } from '../components/common/MealTypeIcon';
import { PageHeader } from '../components/common/PageHeader';
import { useFeedback } from '../context/FeedbackContext';

const MEAL_FILTERS: Array<MealType | 'all'> = ['all', 'breakfast', 'lunch', 'dinner', 'snack'];
const PAGE_SIZE = 20;

function dayKey(iso: string): string {
  return dateKeyInAppTimeZone(new Date(iso));
}

export function MealsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { notify } = useFeedback();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [preset, setPreset] = useState<RangePreset>('all');
  const [range, setRange] = useState<DateRange>(() => rangeForPreset('all'));
  const { start, end } = range;
  const [mealType, setMealType] = useState<MealType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<FoodEntry | null>(null);
  const [detailMeal, setDetailMeal] = useState<FoodEntry | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [rowMenu, setRowMenu] = useState<{ anchor: HTMLElement; meal: FoodEntry } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FoodEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtersActive = preset !== 'all' || mealType !== 'all';

  // Refresh when a meal is saved from the global header dialog.
  useEffect(() => {
    const handler = () => {
      setPage(1);
      setRefreshKey((k) => k + 1);
    };
    window.addEventListener('caloriepal:meal-saved', handler);
    return () => window.removeEventListener('caloriepal:meal-saved', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const filters: MealFilters = {
      start: start || undefined,
      end: end || undefined,
      mealType: mealType === 'all' ? undefined : mealType,
      page,
      pageSize: PAGE_SIZE,
    };
    listMeals(filters)
      .then((res) => {
        if (cancelled) return;
        setEntries(res.data);
        setTotal(res.pagination.total);
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
  }, [start, end, mealType, page, refreshKey]);

  const groups = useMemo(() => {
    const map = new Map<string, FoodEntry[]>();
    for (const e of entries) {
      const key = dayKey(e.consumedAt);
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return Array.from(map.entries());
  }, [entries]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteMeal(pendingDelete.id);
      setEntries((prev) => prev.filter((e) => e.id !== pendingDelete.id));
      setTotal((prev) => Math.max(0, prev - 1));
      notify(`Deleted ${pendingDelete.foodName}`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete entry', 'error');
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const clearFilters = () => {
    setPreset('all');
    setRange(rangeForPreset('all'));
    setMealType('all');
    setPage(1);
  };

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Stack spacing={3} sx={embedded ? { flexGrow: 1, minHeight: 0 } : undefined}>
      {!embedded && (
        <PageHeader title="Meals" subtitle={loading ? 'Loading…' : `${total} entr${total === 1 ? 'y' : 'ies'}${filtersActive ? ' match your filters' : ''}`} />
      )}

      <MealDialog
        open={dialogOpen}
        meal={editingMeal}
        onClose={() => {
          setDialogOpen(false);
          setEditingMeal(null);
        }}
        onSaved={() => {
          setPage(1);
          setRefreshKey((k) => k + 1);
        }}
      />

      <MealDetailDialog meal={detailMeal} onClose={() => setDetailMeal(null)} />

      {error && <Alert severity="error">{error}</Alert>}

      {/* Filters: equal-width meal-type toggles + preset date range. All controls share a 40px height. */}
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={1.5} alignItems={{ lg: 'flex-start' }} useFlexGap sx={{ flexShrink: 0 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={mealType}
          onChange={(_e, v: MealType | 'all' | null) => {
            if (v) {
              setMealType(v);
              setPage(1);
            }
          }}
          aria-label="Meal type filter"
          sx={{
            width: { xs: '100%', lg: 'auto' },
            '& .MuiToggleButton-root': { height: 40, flex: 1, minWidth: { lg: 96 }, px: 1 },
          }}
        >
          {MEAL_FILTERS.map((type) => (
            <ToggleButton key={type} value={type}>
              {type === 'all' ? 'All' : MEAL_TYPE_LABELS[type]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', lg: 'flex-end' },
            gap: 2,
            flexGrow: { xs: 0, lg: 1 },
          }}
        >
          <Box sx={{ flexGrow: 0, flexShrink: 0 }}>
            <DateRangeFilter
              allowAllTime
              preset={preset}
              onPresetChange={setPreset}
              value={range}
              onChange={(r) => {
                setRange(r);
                setPage(1);
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            {total} entr{total === 1 ? 'y' : 'ies'}
          </Typography>
        </Box>
        {filtersActive && (
          <Button size="small" onClick={clearFilters} sx={{ alignSelf: { xs: 'flex-start', lg: 'center' }, height: 40 }}>
            Clear filters
          </Button>
        )}
      </Stack>

      <Box sx={embedded ? { flexGrow: 1, minHeight: 0, overflowY: 'auto' } : undefined}>
      {loading && entries.length === 0 ? (
        <Card>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1.5 }}>
              <Skeleton variant="rectangular" width={40} height={40} />
              <Box sx={{ flexGrow: 1 }}>
                <Skeleton width="40%" />
                <Skeleton width="60%" />
              </Box>
              <Skeleton width={64} />
            </Box>
          ))}
        </Card>
      ) : entries.length === 0 ? (
        <Card>
          <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
              {filtersActive ? 'No meals match these filters' : 'No meals logged yet'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {filtersActive ? 'Try widening the date range or meal type.' : 'Log your first meal to start tracking.'}
            </Typography>
            {filtersActive ? (
              <Button variant="outlined" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button variant="contained" startIcon={<Add />} component={Link} to="/">
                Log a meal
              </Button>
            )}
          </Box>
        </Card>
      ) : (
        <Card sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}>
          {groups.map(([day, items], gi) => {
            const dayTotal = items.reduce((s, e) => s + e.calories, 0);
            return (
              <Box key={day}>
                {gi > 0 && <Divider />}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    px: 2,
                    py: 1,
                    bgcolor: '#f5f5f5',
                  }}
                >
                  <Typography variant="subtitle2">{formatRelativeDate(`${day}T12:00:00`)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(dayTotal)} kcal · {items.length} item{items.length === 1 ? '' : 's'}
                  </Typography>
                </Box>
                {items.map((meal, i) => (
                  <Box key={meal.id}>
                    {i > 0 && <Divider sx={{ ml: 9 }} />}
                    <Box
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${meal.foodName}`}
                      onClick={() => setDetailMeal(meal)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailMeal(meal);
                        }
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 1.5, sm: 2 },
                        pl: 2,
                        pr: 1,
                        py: 1.5,
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'rgba(10,10,10,0.03)' },
                      }}
                    >
                      <MealTypeIcon type={meal.mealType} />
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="body1" noWrap title={meal.foodName}>
                          {meal.foodName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" component="div">
                          {MEAL_TYPE_LABELS[meal.mealType]} · {formatTime(meal.consumedAt)} · {meal.quantity} {meal.unit}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{ display: { xs: 'none', sm: 'block' } }}
                        >
                          P {Math.round(meal.protein)}g · C {Math.round(meal.carbs)}g · F {Math.round(meal.fat)}g · Sodium {Math.round(meal.sodium)}mg
                        </Typography>
                        {formatMicros(meal.vitamins, meal.minerals) && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            component="div"
                            sx={{ display: { xs: 'none', sm: 'block' } }}
                          >
                            {formatMicros(meal.vitamins, meal.minerals)}
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="body1" fontWeight={600} sx={{ whiteSpace: 'nowrap', fontSize: { xs: 14, sm: 16 } }}>
                        {Math.round(meal.calories)} kcal
                      </Typography>
                      <IconButton
                        aria-label={`Actions for ${meal.foodName}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRowMenu({ anchor: e.currentTarget, meal });
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        sx={{ width: 44, height: 44, ml: { xs: -0.5, sm: 0 } }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Box>
            );
          })}
        </Card>
      )}
      </Box>

      <Menu
        anchorEl={rowMenu?.anchor}
        open={Boolean(rowMenu)}
        onClose={() => setRowMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            if (rowMenu) {
              setEditingMeal(rowMenu.meal);
              setDialogOpen(true);
            }
            setRowMenu(null);
          }}
        >
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (rowMenu) setPendingDelete(rowMenu.meal);
            setRowMenu(null);
          }}
        >
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this entry?"
        description={pendingDelete ? `“${pendingDelete.foodName}” will be removed permanently.` : undefined}
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      {pageCount > 1 && (
        <Stack spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
          <Pagination count={pageCount} page={page} onChange={(_e, value) => setPage(value)} color="primary" />
        </Stack>
      )}
    </Stack>
  );
}
