// Tầng gọi API tới bmk-ctv-service (FastAPI + MongoDB).

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';
const TOKEN_KEY = 'bmk_ctv_token';
const USER_KEY = 'bmk_ctv_user';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function checkUnauthorized(status: number, path: string): void {
  if (status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/google')) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/login';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    // Bỏ qua khi body là FormData để trình duyệt tự set multipart boundary.
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, 'Không thể kết nối tới máy chủ');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    checkUnauthorized(response.status, path);
    const detail = isRecord(data) && typeof data.detail === 'string' ? data.detail : undefined;
    throw new ApiError(response.status, detail ?? 'Đã xảy ra lỗi, vui lòng thử lại');
  }

  return data as T;
}

// Tải file (Excel...) trả về từ API và kích hoạt download trên trình duyệt.
export async function downloadFile(path: string, filename: string): Promise<void> {
  const token = getToken();
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { headers });
  } catch {
    throw new ApiError(0, 'Không thể kết nối tới máy chủ');
  }

  if (!response.ok) {
    checkUnauthorized(response.status, path);
    let detail: string | undefined;
    try {
      const data = await response.json();
      detail = isRecord(data) && typeof data.detail === 'string' ? data.detail : undefined;
    } catch {
      // response không phải JSON, bỏ qua
    }
    throw new ApiError(response.status, detail ?? 'Tải file thất bại');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
