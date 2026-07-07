import { ApiError, delay } from './api/client';

const TOKEN_KEY = 'bmk_ctv_token';
const USER_KEY = 'bmk_ctv_user';

export interface AuthUser {
  username: string;
  displayName: string;
}

// Tài khoản demo — khi có backend thật, thay bằng POST /api/auth/login
const DEMO_ACCOUNT = { username: 'admin', password: '123456', displayName: 'Quản trị viên' };

export async function login(username: string, password: string): Promise<AuthUser> {
  if (username !== DEMO_ACCOUNT.username || password !== DEMO_ACCOUNT.password) {
    return delay(null).then(() => {
      throw new ApiError(401, 'Sai tên đăng nhập hoặc mật khẩu');
    });
  }
  const user: AuthUser = { username: DEMO_ACCOUNT.username, displayName: DEMO_ACCOUNT.displayName };
  return delay(user).then((result) => {
    localStorage.setItem(TOKEN_KEY, 'demo-token');
    localStorage.setItem(USER_KEY, JSON.stringify(result));
    return result;
  });
}

export function logout(): void {
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
