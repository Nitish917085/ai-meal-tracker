import { api } from './client';
import type { AuthResponse, User } from '../types';

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/login', { email, password });
}

export function register(name: string, email: string, password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/register', { name, email, password });
}

export function verifyRegister(email: string, otp: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/verify-register', { email, otp });
}

export function getMe(): Promise<{ user: User }> {
  return api.get<{ user: User }>('/auth/me');
}

export function refreshToken(refreshToken: string): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/refresh', { refreshToken });
}

export function logout(refreshToken: string): Promise<{ ok: boolean }> {
  return api.post<{ ok: boolean }>('/auth/logout', { refreshToken });
}

export function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/forgot-password', { email });
}

export function verifyOtp(email: string, otp: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/verify-otp', { email, otp });
}

export function resetPassword(
  email: string,
  newPassword: string,
  otp?: string,
): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/reset-password', { email, otp, newPassword });
}
