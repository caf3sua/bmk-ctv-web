// Giả lập độ trễ mạng và các mã lỗi kiểu REST cho tầng service.
// Khi có backend thật, chỉ cần thay nội dung các hàm trong services/api/*.ts
// bằng lời gọi axios/fetch tới endpoint thật, giữ nguyên chữ ký hàm.

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const SIMULATED_LATENCY_MS = 250;

export function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), SIMULATED_LATENCY_MS));
}

export function readStore<T>(key: string, seed: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  }
}

export function writeStore<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
