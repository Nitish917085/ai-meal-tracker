import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { authenticate, type AuthedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as authService from '../services/auth.service';
import { loginSchema, refreshSchema, registerSchema, resetPasswordSchema, sendOtpSchema, verifyOtpSchema, verifyRegisterSchema } from '../validation';

export const authRouter = Router();

authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthedRequest, res) => {
    res.json({ user: req.user });
  }),
);

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name } = req.body as {
      email: string;
      password: string;
      name: string;
    };
    const result = await authService.register({ email, password, name });
    res.status(201).json(result);
  }),
);

authRouter.post(
  '/verify-register',
  validate(verifyRegisterSchema),
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body as { email: string; otp: string };
    const result = await authService.verifyRegister(email, otp);
    res.json(result);
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };
    const result = await authService.login({ email, password });
    res.json(result);
  }),
);

authRouter.post(
  '/refresh',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    const result = await authService.refresh(refreshToken);
    res.json(result);
  }),
);

authRouter.post(
  '/logout',
  validate(refreshSchema),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/forgot-password',
  validate(sendOtpSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as { email: string };
    await authService.sendOtp(email);
    res.json({ message: 'OTP sent successfully' });
  }),
);

authRouter.post(
  '/verify-otp',
  validate(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const { email, otp } = req.body as { email: string; otp: string };
    const resetToken = await authService.verifyOtp(email, otp);
    res.json({ message: 'OTP verified successfully', resetToken });
  }),
);

authRouter.post(
  '/reset-password',
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { resetToken, newPassword } = req.body as {
      resetToken: string;
      newPassword: string;
    };
    await authService.resetPassword(resetToken, newPassword);
    res.json({ message: 'Password reset successfully' });
  }),
);
