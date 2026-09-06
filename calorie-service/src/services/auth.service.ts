import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { conflict, notFound, unauthorized } from '../utils/httpError';
import { createUser, findUserByEmail, findUserById, markEmailVerified, toPublicUser, updatePassword, type UserWithHash } from '../repositories/user.repo';
import * as refreshTokenRepo from '../repositories/refreshToken.repo';
import { sendOtpEmail } from '../lib/mailer';
import type { User } from '../types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface AuthPayload {
  user: User;
  accessToken: string;
  refreshToken: string;
}

function signAccessToken(user: { id: number; email: string; name: string }): string {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, config.jwt.secret, {
    expiresIn: config.jwt.accessExpiresIn,
  } as jwt.SignOptions);
}

/** Refresh tokens are opaque random strings; only their SHA-256 hash is stored. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Parse a duration string like "15m", "30d" into milliseconds. */
function durationToMs(duration: string): number {
  const match = /^(\d+)([smhdw])$/.exec(duration);
  if (!match) return 30 * 24 * 60 * 60 * 1000;
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
  };
  return Number(match[1]) * (multipliers[match[2]] ?? 86_400_000);
}

async function issueRefreshToken(userId: number): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + durationToMs(config.jwt.refreshExpiresIn));
  await refreshTokenRepo.createRefreshToken(userId, hashToken(token), expiresAt);
  return token;
}

async function issueTokenPair(row: UserWithHash): Promise<{ accessToken: string; refreshToken: string }> {
  return {
    accessToken: signAccessToken(row),
    refreshToken: await issueRefreshToken(row.id),
  };
}

export async function register(input: { email: string; password: string; name: string }): Promise<{ message: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();

  if (!EMAIL_RE.test(email)) throw unauthorized('Please provide a valid email address');
  if (input.password.length < 8) throw unauthorized('Password must be at least 8 characters');
  if (!name) throw unauthorized('Name is required');

  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.emailVerified) throw conflict('An account with this email already exists');
  } else {
    const passwordHash = await bcrypt.hash(input.password, 10);
    await createUser(email, passwordHash, name);
  }

  await storeAndSendOtp(
    email,
    'Registration',
    'Verify your new account',
    'Welcome! Verify your account to get started.',
  );
  return {
    message: config.bypassFullAuth
      ? 'Account created. Verification code logged to server console.'
      : 'Account created. A verification code has been sent to your email.',
  };
}

/** Verify the registration OTP and activate the account, returning tokens. */
export async function verifyRegister(email: string, otp: string): Promise<AuthPayload> {
  const normalized = normalizeEmail(email);

  if (!config.bypassFullAuth) {
    verifyStoredOtp(normalized, otp);
  }

  const row = await findUserByEmail(normalized);
  if (!row) throw notFound('User not found');

  await markEmailVerified(row.id);
  otpStore.delete(normalized);
  const tokens = await issueTokenPair(row);
  return { user: toPublicUser(row), ...tokens };
}

export async function login(input: { email: string; password: string }): Promise<AuthPayload> {
  const row = await findUserByEmail(input.email.trim().toLowerCase());
  if (!row || !(await bcrypt.compare(input.password, row.password_hash))) {
    throw unauthorized('Invalid email or password');
  }

  if (!config.bypassFullAuth && !row.emailVerified) {
    throw unauthorized('Please verify your email before signing in');
  }

  const tokens = await issueTokenPair(row);
  return { user: toPublicUser(row), ...tokens };
}

/**
 * Exchange a valid refresh token for a fresh token pair, rotating (revoking) the
 * old refresh token so each one can only be used once.
 */
export async function refresh(refreshToken: string): Promise<AuthPayload> {
  const hash = hashToken(refreshToken);
  const record = await refreshTokenRepo.findRefreshToken(hash);

  if (!record || record.revokedAt || record.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Invalid or expired refresh token');
  }

  const row = await findUserById(record.userId);
  if (!row) throw unauthorized('Account no longer exists');

  // Rotate: revoke the presented token, then mint a new pair.
  await refreshTokenRepo.revokeRefreshToken(hash);
  const tokens = await issueTokenPair(row);
  return { user: toPublicUser(row), ...tokens };
}

/** Revoke a refresh token (logout). Safe to call with an already-revoked token. */
export async function logout(refreshToken: string): Promise<void> {
  await refreshTokenRepo.revokeRefreshToken(hashToken(refreshToken));
}

// --------------------------------------------------------------------------
// Password reset via email OTP. When `config.bypassFullAuth` is true the OTP
// check is skipped entirely (development only), so resetting works without
// sending any email.
// --------------------------------------------------------------------------

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Generate a 6-digit OTP. */
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Store an OTP for `normalized` and deliver it (email, or console in dev). */
async function storeAndSendOtp(
  normalized: string,
  label: string,
  subject: string,
  bodyLine: string,
): Promise<void> {
  const otp = generateOtp();
  otpStore.set(normalized, { otp, expiresAt: Date.now() + OTP_TTL_MS });

  if (config.bypassFullAuth) {
    console.log(`[DEV] ${label} OTP for ${normalized}: ${otp}`);
    return;
  }
  await sendOtpEmail(normalized, otp, subject, bodyLine);
}

/** Throw unless the stored OTP matches and is not expired. */
function verifyStoredOtp(normalized: string, otp: string | undefined): void {
  const record = otpStore.get(normalized);
  if (!record || record.expiresAt < Date.now() || record.otp !== otp) {
    throw unauthorized('Invalid or expired OTP');
  }
}

/** Generate and send a 6-digit OTP to the account's email. */
export async function sendOtp(email: string): Promise<void> {
  const normalized = normalizeEmail(email);
  const row = await findUserByEmail(normalized);
  if (!row) throw notFound('User not found');

  await storeAndSendOtp(
    normalized,
    'Password-reset',
    'Reset your password',
    'Use this code to reset your password.',
  );
}

/** Confirm the OTP matches the most recently issued one. */
export async function verifyOtp(email: string, otp: string): Promise<void> {
  verifyStoredOtp(normalizeEmail(email), otp);
}

/** Reset the password, requiring a valid OTP unless full auth is bypassed. */
export async function resetPassword(
  email: string,
  otp: string | undefined,
  newPassword: string,
): Promise<void> {
  const normalized = normalizeEmail(email);

  if (!config.bypassFullAuth) {
    verifyStoredOtp(normalized, otp);
  }

  const row = await findUserByEmail(normalized);
  if (!row) throw notFound('User not found');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await updatePassword(row.id, passwordHash);
  await refreshTokenRepo.revokeAllForUser(row.id); // invalidate existing sessions
  otpStore.delete(normalized);
}
