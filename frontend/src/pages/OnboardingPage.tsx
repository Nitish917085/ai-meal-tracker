import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { setGoal, type GoalInput } from '../api/goals';
import { ApiError } from '../api/client';
import { markOnboarded } from '../utils/onboarding';

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

/**
 * First-run goal setup shown immediately after registration. The user can save
 * their initial targets or skip — either way onboarding is marked complete.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<GoalInput>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const setNum = (key: NumKey) => (raw: string) => {
    if (raw !== '' && !/^\d*\.?\d*$/.test(raw)) return;
    setForm((prev) => ({ ...prev, [key]: raw === '' ? null : Number(raw) }));
  };

  const calorieError = touched && (!form.calorieTarget || form.calorieTarget <= 0) ? 'Enter a daily calorie target' : null;
  const invalid = !form.calorieTarget || form.calorieTarget <= 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    setSaving(true);
    setError(null);
    try {
      await setGoal(form);
      markOnboarded();
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save goals');
      setSaving(false);
    }
  };

  const handleSkip = () => {
    markOnboarded();
    navigate('/');
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
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', py: 4 }}>
      <Card>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h5" component="h1" sx={{ mb: 0.5 }}>
            Set your goals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Tell us your daily targets so we can track your progress. You can change these anytime.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

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
              <Grid item xs={6}>
                {numField('currentWeight', 'Current (kg)')}
              </Grid>
              <Grid item xs={6}>
                {numField('targetWeight', 'Target (kg)')}
              </Grid>
              <Grid item xs={12}>
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

            <Stack spacing={1.5} sx={{ mt: 3 }}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
              >
                {saving ? 'Saving…' : 'Save & continue'}
              </Button>
              <Button variant="text" size="large" onClick={handleSkip} disabled={saving}>
                Skip for now
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
