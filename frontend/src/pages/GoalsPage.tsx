import { useEffect, useState, type FormEvent } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getGoals, setGoal, updateGoal, type GoalInput } from '../api/goals';
import { getGoalComparison, type GoalComparison } from '../api/reports';
import type { Goal } from '../types';
import { ApiError } from '../api/client';
import { TodaySummary } from '../components/common/TodaySummary';
import { PageHeader } from '../components/common/PageHeader';
import { useFeedback } from '../context/FeedbackContext';
import { formatDate, todayISO } from '../utils/format';

const emptyForm: GoalInput = {
  calorieTarget: 2000,
  proteinTarget: 120,
  carbTarget: 200,
  fatTarget: 65,
  currentWeight: null,
  targetWeight: null,
  weightGoal: '',
};

type NumKey = 'calorieTarget' | 'proteinTarget' | 'carbTarget' | 'fatTarget' | 'currentWeight' | 'targetWeight';

function toGoalInput(g: Goal): GoalInput {
  return {
    calorieTarget: g.calorieTarget,
    proteinTarget: g.proteinTarget,
    carbTarget: g.carbTarget,
    fatTarget: g.fatTarget,
    currentWeight: g.currentWeight,
    targetWeight: g.targetWeight,
    weightGoal: g.weightGoal ?? '',
  };
}

function sameGoal(a: GoalInput, b: GoalInput): boolean {
  return (Object.keys(a) as Array<keyof GoalInput>).every((k) => (a[k] ?? '') === (b[k] ?? ''));
}

export function GoalsPage() {
  const { notify } = useFeedback();
  const [active, setActive] = useState<Goal | null>(null);
  const [form, setForm] = useState<GoalInput>(emptyForm);
  const [saved, setSaved] = useState<GoalInput>(emptyForm);
  const [todayCmp, setTodayCmp] = useState<GoalComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    const today = todayISO();
    Promise.all([getGoals(), getGoalComparison({ start: today, end: today })])
      .then(([res, cmp]) => {
        if (res.active) {
          setActive(res.active);
          const input = toGoalInput(res.active);
          setForm(input);
          setSaved(input);
        }
        setTodayCmp(cmp);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const setNum = (key: NumKey) => (raw: string) => {
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    setForm((prev) => ({ ...prev, [key]: raw === '' ? null : Number(raw) }));
  };

  const calorieError = touched && (!form.calorieTarget || form.calorieTarget <= 0) ? 'Enter a daily calorie target' : null;
  const weightError =
    form.currentWeight != null && form.targetWeight != null && form.currentWeight === form.targetWeight
      ? 'Current and target weight are the same'
      : null;
  const dirty = !sameGoal(form, saved);
  const invalid = Boolean(calorieError) || !form.calorieTarget || form.calorieTarget <= 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    setError(null);
    setSaving(true);
    try {
      const result = active ? await updateGoal(active.id, form) : await setGoal(form);
      setActive(result);
      setTodayCmp((prev) =>
        prev
          ? { ...prev, goal: { calories: result.calorieTarget, protein: result.proteinTarget, carbs: result.carbTarget, fat: result.fatTarget } }
          : prev,
      );
      const input = toGoalInput(result);
      setForm(input);
      setSaved(input);
      notify('Goals saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save goals');
    } finally {
      setSaving(false);
    }
  };

  const numField = (key: NumKey, label: string, opts?: { required?: boolean; helper?: string | null; error?: boolean }) => (
    <TextField
      fullWidth
      required={opts?.required}
      label={label}
      inputMode="decimal"
      placeholder="—"
      value={form[key] ?? ''}
      onChange={(e) => setNum(key)(e.target.value)}
      onBlur={() => setTouched(true)}
      error={opts?.error}
      helperText={opts?.helper ?? ' '}
      InputLabelProps={{ shrink: true }}
    />
  );

  return (
    <Stack spacing={3} useFlexGap>
      <PageHeader
        title="Health goals"
        subtitle={active ? `Active since ${formatDate(active.createdAt)}` : 'Set daily targets for calories and macros'}
      />

      {error && <Alert severity="error">{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={7} sx={{ order: { xs: 2, md: 1 } }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2.5 }}>
                {active ? 'Daily targets' : 'Set your daily targets'}
              </Typography>
              {loading ? (
                <Skeleton variant="rectangular" height={220} />
              ) : (
                <Box component="form" onSubmit={handleSubmit} noValidate>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      {numField('calorieTarget', 'Calories (kcal)', { required: true, helper: calorieError, error: Boolean(calorieError) })}
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      {numField('proteinTarget', 'Protein (g)')}
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      {numField('carbTarget', 'Carbs (g)')}
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      {numField('fatTarget', 'Fat (g)')}
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1.5 }}>
                    Weight (optional)
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      {numField('currentWeight', 'Current (kg)', { error: Boolean(weightError) })}
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      {numField('targetWeight', 'Target (kg)', { error: Boolean(weightError), helper: weightError })}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Weight goal note"
                        placeholder="e.g. Lose 5 kg by December"
                        value={form.weightGoal ?? ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, weightGoal: e.target.value }))}
                        helperText=" "
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                  </Grid>

                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                    <Button type="submit" variant="contained" disabled={saving || !dirty || (touched && invalid)}>
                      {saving ? 'Saving…' : 'Save goals'}
                    </Button>
                    {dirty && !saving && (
                      <Button
                        variant="text"
                        onClick={() => {
                          setForm(saved);
                          setTouched(false);
                        }}
                      >
                        Discard changes
                      </Button>
                    )}
                    {!dirty && active && (
                      <Typography variant="caption" color="text.secondary">
                        All changes saved
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5} sx={{ order: { xs: 1, md: 2 } }}>
          <Stack spacing={0} sx={{ height: '100%' }}>
            <TodaySummary data={todayCmp} loading={loading} variant="full" />
            {active && (active.currentWeight != null || active.targetWeight != null) && (
              <Box sx={{ border: 1, borderTop: 0, borderColor: 'divider', bgcolor: 'background.paper', px: { xs: 2, sm: 3 }, py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Weight
                </Typography>
                <Typography variant="body1">
                  {active.currentWeight != null ? `${active.currentWeight} kg` : '—'}
                  {active.targetWeight != null && (
                    <Typography component="span" color="text.secondary">
                      {' '}→ {active.targetWeight} kg
                    </Typography>
                  )}
                </Typography>
                {active.weightGoal && (
                  <Typography variant="caption" color="text.secondary">
                    {active.weightGoal}
                  </Typography>
                )}
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
