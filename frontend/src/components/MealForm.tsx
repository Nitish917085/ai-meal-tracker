import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import type { MealType } from '../types';
import type { MealInput } from '../api/meals';
import { APP_TIME_ZONE } from '../utils/format';
import { MEAL_TYPE_LABELS, nowISO } from '../utils/format';
import { MEAL_TYPE_ICONS } from './common/MealTypeIcon';
import { MINERALS, VITAMINS, nutrientLabel, nutrientUnit, type Nutrient } from '../utils/nutrients';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const UNITS = ['serving', 'grams', 'cups', 'pieces', 'ml', 'oz'];

type NumericKey = 'quantity' | 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber' | 'sugar' | 'sodium';

const MACROS: Array<{ key: NumericKey; label: string }> = [
  { key: 'calories', label: 'Calories (kcal)' },
  { key: 'protein', label: 'Protein (g)' },
  { key: 'carbs', label: 'Carbs (g)' },
  { key: 'fat', label: 'Fat (g)' },
];
const EXTRAS: Array<{ key: NumericKey; label: string }> = [
  { key: 'fiber', label: 'Fiber (g)' },
  { key: 'sugar', label: 'Sugar (g)' },
  { key: 'sodium', label: 'Sodium (mg)' },
];

export interface MealFormProps {
  initial?: Partial<MealInput>;
  submitLabel?: string;
  submitting?: boolean;
  onSubmit: (input: MealInput) => void;
  /** Optional cancel handler — renders a Cancel button next to Save. */
  onCancel?: () => void;
}

/** Form state keeps numbers as strings so users can clear a field and type freely. */
interface FormState {
  mealType: MealType;
  foodName: string;
  unit: string;
  consumedAt: string;
  numbers: Record<NumericKey, string>;
  vitamins: Record<string, string>;
  minerals: Record<string, string>;
}

/** Convert a numeric micronutrient map into string values for the form. */
function toStrMap(m?: Record<string, number>): Record<string, string> {
  if (!m) return {};
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, String(v)]));
}

/** Convert string form values back into numeric micronutrients (empty → 0). */
function toNumMap(m: Record<string, string>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(m).map(([k, v]) => {
      const n = Number(v);
      return [k, v.trim() === '' || Number.isNaN(n) ? 0 : n];
    }),
  );
}

function toState(initial?: Partial<MealInput>): FormState {
  const num = (v: number | undefined, fallback = ''): string =>
    v == null || (v === 0 && fallback === '') ? fallback : String(v);
  return {
    mealType: initial?.mealType ?? 'breakfast',
    foodName: initial?.foodName ?? '',
    unit: initial?.unit ?? 'serving',
    consumedAt: initial?.consumedAt ?? nowISO(),
    numbers: {
      quantity: initial?.quantity != null ? String(initial.quantity) : '1',
      calories: num(initial?.calories),
      protein: num(initial?.protein),
      carbs: num(initial?.carbs),
      fat: num(initial?.fat),
      fiber: num(initial?.fiber),
      sugar: num(initial?.sugar),
      sodium: num(initial?.sodium),
    },
    vitamins: toStrMap(initial?.vitamins),
    minerals: toStrMap(initial?.minerals),
  };
}

interface MicrosEditorProps {
  title: string;
  options: Nutrient[];
  values: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
}

/** Key/value editor for vitamins and minerals, with a dropdown of predefined nutrients. */
function MicrosEditor({ title, options, values, onChange }: MicrosEditorProps) {
  const [key, setKey] = useState('');
  const [val, setVal] = useState('');
  const entries = Object.entries(values);
  const addedKeys = new Set(Object.keys(values));
  const numeric = (raw: string) => raw === '' || /^\d*\.?\d*$/.test(raw);

  const add = () => {
    const n = Number(val);
    if (!key || val.trim() === '' || Number.isNaN(n) || n < 0) return;
    onChange({ ...values, [key]: String(n) });
    setKey('');
    setVal('');
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {entries.map(([k, v]) => (
        <Stack key={k} direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
          <Typography sx={{ flex: 1, fontSize: 14 }} noWrap>
            {nutrientLabel(k)}
          </Typography>
          <TextField
            size="small"
            inputMode="decimal"
            placeholder="0"
            value={v}
            onChange={(e) => {
              if (!numeric(e.target.value)) return;
              onChange({ ...values, [k]: e.target.value });
            }}
            sx={{ width: 140 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ width: 24 }}>
            {nutrientUnit(k)}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onChange(Object.fromEntries(Object.entries(values).filter(([kk]) => kk !== k)))}
          >
            <Close fontSize="small" />
          </IconButton>
        </Stack>
      ))}
      {entries.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          None yet — pick one below.
        </Typography>
      )}
      <Stack direction="row" spacing={1} alignItems="center">
        <FormControl size="small" sx={{ flex: 1 }}>
          <InputLabel id={`micros-label-${title}`}>Nutrient</InputLabel>
          <Select
            labelId={`micros-label-${title}`}
            label="Nutrient"
            value={key}
            onChange={(e) => setKey(e.target.value as string)}
          >
            {options.map((o) => (
              <MenuItem key={o.key} value={o.key} disabled={addedKeys.has(o.key)}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          placeholder="0"
          inputMode="decimal"
          value={val}
          onChange={(e) => {
            if (!numeric(e.target.value)) return;
            setVal(e.target.value);
          }}
          sx={{ width: 140 }}
        />
        <Button size="small" onClick={add} disabled={!key || val.trim() === ''}>
          Add
        </Button>
      </Stack>
    </Box>
  );
}

/**
 * Shared form for creating and editing a food entry.
 */
export function MealForm({ initial, submitLabel = 'Save entry', submitting, onSubmit, onCancel }: MealFormProps) {
  const [form, setForm] = useState<FormState>(() => toState(initial));
  // Errors only appear after a submit attempt, or after the user typed and then cleared the field.
  const [touched, setTouched] = useState(false);
  const [edited, setEdited] = useState(false);

  const nameError = (touched || edited) && !form.foodName.trim() ? 'Enter a food name' : null;
  const quantityError =
    form.numbers.quantity !== '' && Number(form.numbers.quantity) <= 0 ? 'Must be greater than 0' : null;
  const invalid = !form.foodName.trim() || Boolean(quantityError);

  const setNumber = (key: NumericKey) => (value: string) => {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setForm((prev) => ({ ...prev, numbers: { ...prev.numbers, [key]: value } }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    const n = (key: NumericKey, fallback = 0) => {
      const v = Number(form.numbers[key]);
      return form.numbers[key] === '' || Number.isNaN(v) ? fallback : v;
    };
    onSubmit({
      mealType: form.mealType,
      foodName: form.foodName.trim(),
      unit: form.unit,
      consumedAt: form.consumedAt,
      quantity: n('quantity', 1),
      calories: n('calories'),
      protein: n('protein'),
      carbs: n('carbs'),
      fat: n('fat'),
      fiber: n('fiber'),
      sugar: n('sugar'),
      sodium: n('sodium'),
      vitamins: toNumMap(form.vitamins),
      minerals: toNumMap(form.minerals),
    });
  };

  const numberField = (key: NumericKey, label: string) => (
    <TextField
      fullWidth
      label={label}
      inputMode="decimal"
      placeholder="0"
      value={form.numbers[key]}
      onChange={(e) => setNumber(key)(e.target.value)}
      InputLabelProps={{ shrink: true }}
    />
  );

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Meal
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={form.mealType}
        onChange={(_e, value: MealType | null) => value && setForm((p) => ({ ...p, mealType: value }))}
        sx={{ mb: 2.5 }}
        aria-label="Meal type"
      >
        {MEAL_TYPES.map((type) => {
          const Icon = MEAL_TYPE_ICONS[type];
          return (
            <ToggleButton key={type} value={type} sx={{ flexDirection: 'column', gap: 0.5, py: 1.25 }}>
              <Icon fontSize="small" />
              <Typography variant="caption" sx={{ lineHeight: 1 }}>
                {MEAL_TYPE_LABELS[type]}
              </Typography>
            </ToggleButton>
          );
        })}
      </ToggleButtonGroup>

      <TextField
        fullWidth
        required
        label="Food name"
        placeholder="e.g. Grilled chicken salad"
        value={form.foodName}
        onChange={(e) => {
          setEdited(true);
          setForm((p) => ({ ...p, foodName: e.target.value }));
        }}
        error={Boolean(nameError)}
        helperText={nameError ?? ' '}
        sx={{ mb: 1 }}
      />

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            label="Quantity"
            inputMode="decimal"
            value={form.numbers.quantity}
            onChange={(e) => setNumber('quantity')(e.target.value)}
            error={Boolean(quantityError)}
            helperText={quantityError ?? ' '}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            select
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            helperText=" "
          >
            {UNITS.map((unit) => (
              <MenuItem key={unit} value={unit}>
                {unit}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Nutrition per entry
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {MACROS.map(({ key, label }) => (
          <Grid item xs={6} sm={3} key={key}>
            {numberField(key, label)}
          </Grid>
        ))}
        {EXTRAS.map(({ key, label }) => (
          <Grid item xs={4} key={key}>
            {numberField(key, label)}
          </Grid>
        ))}
      </Grid>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Vitamins & minerals (optional)
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          mb: 2,
          '@media (min-width: 630px)': {
            flexDirection: 'row',
          },
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MicrosEditor title="Vitamins" options={VITAMINS} values={form.vitamins} onChange={(vitamins) => setForm((p) => ({ ...p, vitamins }))} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <MicrosEditor title="Minerals" options={MINERALS} values={form.minerals} onChange={(minerals) => setForm((p) => ({ ...p, minerals }))} />
        </Box>
      </Box>

      <TextField
        fullWidth
        label="Date & time"
        type="datetime-local"
        value={toLocalInput(form.consumedAt)}
        onChange={(e) =>
          setForm((p) => ({
            ...p,
            consumedAt: e.target.value ? new Date(`${e.target.value}:00+05:30`).toISOString() : p.consumedAt,
          }))
        }
        InputLabelProps={{ shrink: true }}
        sx={{ mb: 3 }}
      />

      <Stack direction="row" spacing={1.5} justifyContent="flex-end">
        {onCancel && (
          <Button type="button" variant="outlined" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="contained"
          disabled={submitting || (touched && invalid)}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </Stack>
    </Box>
  );
}

/** Convert an ISO datetime into the value expected by <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
