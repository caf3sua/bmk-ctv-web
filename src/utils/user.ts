import type { UserRole } from '../types/user';

export function roleLabel(role: UserRole): string {
  return role === 'admin' ? 'Quản trị viên' : 'Nhân viên';
}
