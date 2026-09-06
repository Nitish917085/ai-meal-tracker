import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, TextField } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { AuthShell } from '../components/common/AuthShell';
import { AuthLink } from '../components/common/AuthLink';
import { PasswordField } from '../components/common/PasswordField';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Collect every validation message the backend returned (Zod field errors). */
function extractMessages(err: unknown): string[] {
  if (err instanceof ApiError) {
    if (Array.isArray(err.details)) {
      const messages = err.details
        .map((d) => (d && typeof d === 'object' ? (d as { message?: string }).message : undefined))
        .filter((m): m is string => Boolean(m));
      if (messages.length) return messages;
    }
    return [err.message];
  }
  return ['Something went wrong'];
}

export function RegisterPage() {
  const { register, verifyRegister } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setInfo(null);

    // Name + password are validated on the frontend only.
    let valid = true;
    if (!name.trim()) {
      setNameError('Name is required');
      valid = false;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    }
    if (!valid) return;

    // Email is validated on the backend, which emails a verification code.
    setSubmitting(true);
    try {
      if (!otpSent) {
        // First submit: create account + send OTP, then reveal the OTP field inline.
        const message = await register(name, email, password);
        setInfo(message);
        setOtpSent(true);
      } else {
        // Second submit: verify the OTP and sign in, then start first-run onboarding.
        await verifyRegister(email, otp);
        navigate('/onboarding');
      }
    } catch (err) {
      setErrors(extractMessages(err));
    } finally {
      setSubmitting(false);
    }
  };

  const resend = async () => {
    setErrors([]);
    setInfo(null);
    setSubmitting(true);
    try {
      const message = await register(name, email, password);
      setInfo(message);
    } catch (err) {
      setErrors(extractMessages(err));
    } finally {
      setSubmitting(false);
    }
  };

  const changeEmail = () => {
    setOtpSent(false);
    setOtp('');
    setInfo(null);
    setErrors([]);
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle={otpSent ? 'Enter the 6-digit code sent to your email' : 'Start tracking meals, goals and trends'}
      footer={
        <>
          Already have an account? <AuthLink to="/login">Sign in</AuthLink>
        </>
      }
    >
      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          <Box component="ul" sx={{ m: 0, pl: 2 }}>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </Box>
        </Alert>
      )}
      {info && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {info}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          label="Name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={Boolean(nameError)}
          helperText={nameError ?? ' '}
          autoFocus
          sx={{ mb: 1 }}
        />
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(null);
          }}
          error={Boolean(emailError)}
          helperText={emailError ?? ' '}
          disabled={otpSent}
          sx={{ mb: 1 }}
        />
        <PasswordField
          fullWidth
          label="Password"
          autoComplete="new-password"
          helperText={passwordError ?? 'At least 8 characters'}
          value={password}
          error={Boolean(passwordError)}
          onChange={(e) => {
            setPassword(e.target.value);
            if (passwordError) setPasswordError(null);
          }}
          sx={{ mb: 2 }}
        />

        {otpSent && (
          <TextField
            fullWidth
            label="Verification code"
            inputProps={{ maxLength: 6, inputMode: 'numeric', style: { letterSpacing: '0.3em', fontWeight: 600 } }}
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            sx={{ mb: 3 }}
          />
        )}

        <Button
          fullWidth
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {otpSent ? 'Verify & sign in' : 'Create account'}
        </Button>

        {otpSent && (
          <Button
            fullWidth
            size="small"
            sx={{ mt: 1 }}
            disabled={submitting}
            onClick={resend}
          >
            Didn't get the code? Resend
          </Button>
        )}

        {otpSent && (
          <Button
            fullWidth
            size="small"
            variant="text"
            sx={{ mt: 1 }}
            disabled={submitting}
            onClick={changeEmail}
          >
            Change email
          </Button>
        )}
      </Box>

    </AuthShell>
  );
}
