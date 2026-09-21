import type {
  ListReconciliationParams,
  ReconciliationListResponse,
  ReconciliationRecord,
  SyncSystemInfoResult,
} from '../../types/reconciliation';
import { apiFetch } from './client';

export async function listReconciliations(
  params?: ListReconciliationParams
): Promise<ReconciliationListResponse> {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.employment_status && params.employment_status !== 'all') {
    query.set('employment_status', params.employment_status);
  }
  if (params?.reconciliation_status && params.reconciliation_status !== 'all') {
    query.set('reconciliation_status', params.reconciliation_status);
  }
  if (params?.created_source && params.created_source !== 'all') {
    query.set('created_source', params.created_source);
  }
  if (params?.page) query.set('page', String(params.page));
  if (params?.page_size) query.set('page_size', String(params.page_size));

  const qs = query.toString();
  return apiFetch<ReconciliationListResponse>(`/reconciliation${qs ? `?${qs}` : ''}`);
}

export async function getReconciliation(employeeCode: string): Promise<ReconciliationRecord> {
  return apiFetch<ReconciliationRecord>(`/reconciliation/${encodeURIComponent(employeeCode)}`);
}

export async function syncBmkSystemInfo(): Promise<SyncSystemInfoResult> {
  return apiFetch<SyncSystemInfoResult>('/reconciliation/sync-system-info', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
