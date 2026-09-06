import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { ApiError } from '../api/client';
import * as authApi from '../api/auth';
import { AuthShell } from '../components/common/AuthShell';
import { AuthLink } from '../components/common/AuthLink';
import { PasswordField } from '../components/common/PasswordField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = 'email' | 'otp' | 'password' | 'done';

const stepTitle: Record<Step, string> = {
  email: 'Reset your password',
  otp: 'Enter the code',
  password: 'Choose a new password',
  done: 'Password updated',
};

const stepSubtitle: Record<Step, string> = {
  email: 'Enter your account email to receive a code',
  otp: 'Enter the 6-digit code sent to your email',
  password: 'Set a new password for your account',
  done: 'Your password has been reset',
};

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address');
      return;
    }
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      setInfo('An OTP has been sent to your email.');
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    try {
      const result = await authApi.verifyOtp(email, otp);
      setResetToken(result.resetToken);
      setStep('password');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      if (!resetToken) {
        setError('Verify the OTP before choosing a new password');
        return;
      }
      await authApi.resetPassword(resetToken, password);
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={stepTitle[step]}
      subtitle={stepSubtitle[step]}
      footer={
        step !== 'done' ? (
          <>
            Remembered your password? <AuthLink to="/login">Sign in</AuthLink>
          </>
        ) : undefined
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      {step === 'email' && (
        <Box component="form" onSubmit={handleSendOtp} noValidate>
          <TextField
            fullWidth
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Send code
          </Button>
        </Box>
      )}

      {step === 'otp' && (
        <Box component="form" onSubmit={handleVerifyOtp} noValidate>
          <TextField
            fullWidth
            label="Verification code"
            autoFocus
            inputProps={{ maxLength: 6, inputMode: 'numeric', style: { letterSpacing: '0.3em', fontWeight: 600 } }}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Verify code
          </Button>
          <Button
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            onClick={() => {
              setStep('email');
              setInfo(null);
              setError(null);
            }}
          >
            Use a different email
          </Button>
        </Box>
      )}

      {step === 'password' && (
        <Box component="form" onSubmit={handleReset} noValidate>
          <PasswordField
            fullWidth
            label="New password"
            autoComplete="new-password"
            helperText="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
          />
          <PasswordField
            fullWidth
            label="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            sx={{ mb: 3 }}
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Reset password
          </Button>
        </Box>
      )}

      {step === 'done' && (
        <Box sx={{ textAlign: 'center' }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            Your password has been reset successfully.
          </Alert>
          <Button component={Link} to="/login" variant="contained" fullWidth size="large">
            Sign in
          </Button>
        </Box>
      )}

    </AuthShell>
  );
}
