import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { FoodEntry } from '../types';
import { MealTypeIcon } from './common/MealTypeIcon';
import { formatDate, formatTime, micronutrientLabel, micronutrientUnit, MEAL_TYPE_LABELS } from '../utils/format';

interface Macro {
  label: string;
  value: number;
  unit: string;
}

interface MicroRow {
  label: string;
  value: number;
  unit: string;
}

/** Turn a free-form vitamins/minerals object into sorted, labeled rows. */
function toMicroRows(source: Record<string, number> | undefined): MicroRow[] {
  return Object.entries(source ?? {})
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: micronutrientLabel(k), value: v, unit: micronutrientUnit(k) }));
}

/**
 * Read-only detail view for a single food entry. Clicking a row in the Meals
 * list opens this; editing happens through the explicit "Edit" action instead.
 */
export function MealDetailDialog({ meal, onClose }: { meal: FoodEntry | null; onClose: () => void }) {
  if (!meal) return null;

  const macros: Macro[] = [
    { label: 'Protein', value: meal.protein, unit: 'g' },
    { label: 'Carbs', value: meal.carbs, unit: 'g' },
    { label: 'Fat', value: meal.fat, unit: 'g' },
    { label: 'Fiber', value: meal.fiber, unit: 'g' },
    { label: 'Sugar', value: meal.sugar, unit: 'g' },
    { label: 'Sodium', value: meal.sodium, unit: 'mg' },
  ];
  const vitamins = toMicroRows(meal.vitamins);
  const minerals = toMicroRows(meal.minerals);

  const renderMicros = (title: string, rows: MicroRow[]) =>
    rows.length > 0 && (
      <>
        <Divider />
        <Box>
          <Typography variant="overline" color="text.secondary">
            {title}
          </Typography>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            {rows.map((m) => (
              <Grid item xs={6} key={m.label}>
                <Typography variant="body2" color="text.secondary">
                  {m.label}
                </Typography>
                <Typography variant="body1" fontWeight={600}>
                  {Math.round(m.value)} {m.unit}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Box>
      </>
    );

  return (
    <Dialog open={Boolean(meal)} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, pr: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ minWidth: 0, flexGrow: 1 }}>
          <MealTypeIcon type={meal.mealType} size={36} />
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography variant="h6" component="div" sx={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              {meal.foodName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {MEAL_TYPE_LABELS[meal.mealType]} · {formatTime(meal.consumedAt)} · {formatDate(meal.consumedAt)}
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Portion
            </Typography>
            <Typography variant="body1">
              {meal.quantity} {meal.unit}
            </Typography>
          </Box>

          <Box>
            <Typography variant="overline" color="text.secondary">
              Calories
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {Math.round(meal.calories)} kcal
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Typography variant="overline" color="text.secondary">
              Macronutrients
            </Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              {macros.map((m) => (
                <Grid item xs={6} key={m.label}>
                  <Typography variant="body2" color="text.secondary">
                    {m.label}
                  </Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {Math.round(m.value)} {m.unit}
                  </Typography>
                </Grid>
              ))}
            </Grid>
          </Box>

          {renderMicros('Vitamins', vitamins)}
          {renderMicros('Minerals', minerals)}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
