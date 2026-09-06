import { MenuItem, Stack, TextField } from '@mui/material';
import { shiftDate, todayISO } from '../../utils/format';

export type RangePreset = 'today' | '3d' | '7d' | '14d' | '30d' | 'all' | 'custom';

export interface DateRange {
  /** YYYY-MM-DD, or '' for "no lower bound" (all time). */
  start: string;
  /** YYYY-MM-DD. */
  end: string;
}

const PRESET_DAYS: Partial<Record<RangePreset, number>> = { today: 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30 };

const LABELS: Record<RangePreset, string> = {
  today: 'Today',
  '3d': 'Last 3 days',
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  all: 'All time',
  custom: 'Custom range',
};

/** Range for a preset, anchored at today. */
export function rangeForPreset(preset: Exclude<RangePreset, 'custom'>): DateRange {
  const end = todayISO();
  if (preset === 'all') return { start: '', end };
  const days = PRESET_DAYS[preset] ?? 7;
  return { start: shiftDate(end, -(days - 1)), end };
}

/** Which preset (if any) a range corresponds to. */
export function presetForRange(range: DateRange): RangePreset {
  if (range.end !== todayISO()) return 'custom';
  if (range.start === '') return 'all';
  for (const p of ['today', '3d', '7d', '14d', '30d'] as const) {
    if (rangeForPreset(p).start === range.start) return p;
  }
  return 'custom';
}

/**
 * Preset-first date range picker: a compact select for common ranges, with
 * From/To inputs revealed only when "Custom range" is chosen.
 */
export function DateRangeFilter({
  value,
  onChange,
  allowAllTime = false,
  /** Controlled preset so "Custom range" can stay selected while the user edits dates. */
  preset,
  onPresetChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allowAllTime?: boolean;
  preset: RangePreset;
  onPresetChange: (preset: RangePreset) => void;
}) {
  const options: RangePreset[] = ['today', '3d', '7d', '14d', '30d', ...(allowAllTime ? (['all'] as const) : []), 'custom'];

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
      <TextField
        select
        size="small"
        label="Range"
        value={preset}
        onChange={(e) => {
          const next = e.target.value as RangePreset;
          onPresetChange(next);
          if (next !== 'custom') onChange(rangeForPreset(next));
        }}
        sx={{ minWidth: 170 }}
      >
        {options.map((p) => (
          <MenuItem key={p} value={p}>
            {LABELS[p]}
          </MenuItem>
        ))}
      </TextField>
      {preset === 'custom' && (
        <Stack direction="row" spacing={1.5}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: value.end || undefined }}
            sx={{ flex: 1, minWidth: 150 }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={value.end}
            onChange={(e) => e.target.value && onChange({ ...value, end: e.target.value })}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: value.start || undefined, max: todayISO() }}
            sx={{ flex: 1, minWidth: 150 }}
          />
        </Stack>
      )}
    </Stack>
  );
}
