import type { ActivityLog } from '../../types/activityLog';
import { apiFetch } from './client';

export async function listActivityLogs(): Promise<ActivityLog[]> {
  return apiFetch<ActivityLog[]>('/activity-logs');
}
