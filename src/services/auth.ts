import { apiFetch } from './api/client';
import type { UserRole } from '../types/user';

const TOKEN_KEY = 'bmk_ctv_token';
const USER_KEY = 'bmk_ctv_user';

export interface AuthUser {
  username: string;
  name: string;
  email: string;
  role: UserRole;
}

interface LoginResponse {
  token: string;
  user: AuthUser;
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const result = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  return result.user;
}

export async function loginWithGoogle(idToken: string): Promise<AuthUser> {
  const result = await apiFetch<LoginResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ token: idToken }),
  });
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(USER_KEY, JSON.stringify(result.user));
  return result.user;
}

export async function logout(): Promise<void> {
  try {
    // Ghi nhật ký hệ thống; JWT không cần hủy phía server nên bỏ qua lỗi mạng nếu có.
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Vẫn đăng xuất phía client dù gọi API thất bại.
  }
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): AuthUser | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}
