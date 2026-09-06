import { Box, Button, Divider, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Edit } from '@mui/icons-material';
import type { FoodEntry } from '../../types';
import type { ImportEntry } from '../../api/import';
import { MEAL_TYPE_LABELS, micronutrientLabel, micronutrientUnit } from '../../utils/format';
import { MealTypeIcon } from '../common/MealTypeIcon';

type Row = FoodEntry | ImportEntry;

interface NutrientItem {
  label: string;
  value: number;
  unit: string;
}

function formatValue(v: number): string {
  return Number.isFinite(v) ? String(Math.round(v)) : '0';
}

/**
 * Compact nutrition preview: shows the first N nutrients inline, and reveals
 * the full list in a hover tooltip. Prevents the meal card from overflowing.
 */
function CompactNutrition({ items, inlineCount = 3 }: { items: NutrientItem[]; inlineCount?: number }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, inlineCount);
  const rest = items.slice(inlineCount);
  return (
    <Typography variant="caption" color="text.secondary" component="div" sx={{ whiteSpace: 'nowrap' }}>
      {visible.map((n) => `${n.label} ${formatValue(n.value)}${n.unit}`).join(' · ')}
      {rest.length > 0 && (
        <Tooltip
          title={
            <Box sx={{ py: 0.5 }}>
              {items.map((n) => (
                <Typography key={n.label} variant="caption" component="div" sx={{ color: '#fff', lineHeight: 1.4 }}>
                  {n.label}: {formatValue(n.value)}
                  {n.unit}
                </Typography>
              ))}
            </Box>
          }
        >
          <Box component="span" sx={{ cursor: 'help', textDecoration: 'underline dotted', mx: 0.5 }}>
            +{rest.length} more
          </Box>
        </Tooltip>
      )}
    </Typography>
  );
}

function RowLine({ row }: { row: Row }) {
  const macros: NutrientItem[] = [
    { label: 'Fiber', value: row.fiber, unit: 'g' },
    { label: 'Sugar', value: row.sugar, unit: 'g' },
    { label: 'Sodium', value: row.sodium, unit: 'mg' },
  ];
  const micros: NutrientItem[] = Object.entries({ ...row.vitamins, ...row.minerals })
    .filter(([, v]) => Number.isFinite(v))
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ label: micronutrientLabel(k), value: v, unit: micronutrientUnit(k) }));

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, minWidth: 0 }}>
      <MealTypeIcon type={row.mealType} size={32} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={500} sx={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.foodName}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ whiteSpace: 'nowrap' }}>
          {MEAL_TYPE_LABELS[row.mealType]} · {row.quantity} {row.unit}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ whiteSpace: 'nowrap' }}>
          P {Math.round(row.protein)}g · C {Math.round(row.carbs)}g · F {Math.round(row.fat)}g
        </Typography>
        <CompactNutrition items={macros} inlineCount={3} />
        <CompactNutrition items={micros} inlineCount={3} />
      </Box>
      <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
        {Math.round(row.calories)} kcal
      </Typography>
    </Box>
  );
}

/**
 * Card rendered inside the log thread after a photo/text extraction.
 * - "logged": entries already saved; offers Edit and Undo.
 * - "pending": entries need confirmation before saving.
 */
export function MealResultCard({
  mode,
  rows,
  onEdit,
  onUndo,
  onConfirm,
  onDiscard,
  busy,
}: {
  mode: 'logged' | 'pending' | 'undone' | 'discarded';
  rows: Row[];
  onEdit?: (index: number) => void;
  onUndo?: () => void;
  onConfirm?: () => void;
  onDiscard?: () => void;
  busy?: boolean;
}) {
  const total = rows.reduce((s, r) => s + r.calories, 0);
  const done = mode === 'undone' || mode === 'discarded';
  return (
    <Box sx={{ border: 1, borderColor: done ? 'divider' : 'primary.main', bgcolor: 'background.paper', mt: 1.25, opacity: done ? 0.6 : 1 }}>
      <Box sx={{ px: 1.5, pt: 0.5 }}>
        {rows.map((r, i) => (
          <Box key={i}>
            {i > 0 && <Divider />}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <RowLine row={r} />
              </Box>
              {mode === 'logged' && onEdit && (
                <Tooltip title="Edit">
                  <IconButton size="small" aria-label={`Edit ${r.foodName}`} onClick={() => onEdit(i)} sx={{ ml: 0.5, flexShrink: 0 }}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>
        ))}
      </Box>
      <Divider />
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 1.5, py: 1, gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {rows.length} item{rows.length === 1 ? '' : 's'} · {Math.round(total)} kcal
          {mode === 'undone' && ' · removed'}
          {mode === 'discarded' && ' · discarded'}
        </Typography>
        {mode === 'logged' && onUndo && (
          <Button size="small" onClick={onUndo} disabled={busy}>
            Undo
          </Button>
        )}
        {mode === 'pending' && (
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={onDiscard} disabled={busy}>
              Discard
            </Button>
            <Button size="small" variant="contained" onClick={onConfirm} disabled={busy}>
              {busy ? 'Logging…' : 'Log these'}
            </Button>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
