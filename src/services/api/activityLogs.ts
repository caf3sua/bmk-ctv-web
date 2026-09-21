import type { ActivityLog } from '../../types/activityLog';
import { apiFetch } from './client';

export interface ListActivityLogsParams {
  employee_code?: string;
  employeeCode?: string;
}

export async function listActivityLogs(params?: ListActivityLogsParams): Promise<ActivityLog[]> {
  const code = params?.employee_code || params?.employeeCode;
  const query = code ? `?employee_code=${encodeURIComponent(code)}` : '';
  return apiFetch<ActivityLog[]>(`/activity-logs${query}`);
}

