export type UserRole = 'admin' | 'staff';

export interface AdminUser {
  username: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AdminUserInput = Omit<AdminUser, 'createdAt' | 'updatedAt'> & { password: string };

export const emptyAdminUser = (): AdminUserInput => ({
  username: '',
  name: '',
  email: '',
  role: 'staff',
  active: true,
  password: '',
});
