import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AuthShell } from '../components/common/AuthShell';
import { AuthLink } from '../components/common/AuthLink';
import { PasswordField } from '../components/common/PasswordField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailError = touched.email && !EMAIL_RE.test(email.trim()) ? 'Enter a valid email address' : null;
  const passwordError = touched.password && !password ? 'Enter your password' : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!EMAIL_RE.test(email.trim()) || !password) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to track your daily nutrition"
      footer={
        <>
          Don't have an account? <AuthLink to="/register">Sign up</AuthLink>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          error={Boolean(emailError)}
          helperText={emailError ?? ' '}
          sx={{ mb: 1 }}
        />
        <PasswordField
          fullWidth
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={Boolean(passwordError)}
          helperText={passwordError ?? ' '}
          sx={{ mb: 2 }}
        />
        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          Sign in
        </Button>
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <AuthLink to="/forgot-password">Forgot password?</AuthLink>
        </Box>
      </Box>
    </AuthShell>
  );
}
