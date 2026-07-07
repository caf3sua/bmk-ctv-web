import type { AdminUser, AdminUserInput } from '../../types/user';
import { apiFetch } from './client';

export async function listUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/users');
}

export async function getUser(username: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${encodeURIComponent(username)}`);
}

export async function createUser(input: AdminUserInput): Promise<AdminUser> {
  return apiFetch<AdminUser>('/users', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateUser(
  username: string,
  input: Partial<AdminUserInput>,
): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/users/${encodeURIComponent(username)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteUser(username: string): Promise<void> {
  return apiFetch<void>(`/users/${encodeURIComponent(username)}`, {
    method: 'DELETE',
  });
}
