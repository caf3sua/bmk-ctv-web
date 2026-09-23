import type {
  ImportHrBmkResult,
  ImportHrTpBankResult,
  ListReconciliationParams,
  ReconciliationHistoryListResponse,
  ReconciliationListResponse,
  ReconciliationRecord,
  SyncSystemInfoResult,
} from '../../types/reconciliation';
import { apiFetch, downloadFile } from './client';

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
  if (params?.is_synced && params.is_synced !== 'all') {
    query.set('is_synced', params.is_synced);
  }
  if (params?.result_status && params.result_status !== 'all') {
    query.set('result_status', params.result_status);
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

export async function importHrBmkFile(file: File): Promise<ImportHrBmkResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ImportHrBmkResult>('/reconciliation/import-hr-bmk', {
    method: 'POST',
    body: formData,
  });
}

export async function reconcileTpBankFile(file: File): Promise<ImportHrBmkResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ImportHrBmkResult>('/reconciliation/reconcile-tpbank', {
    method: 'POST',
    body: formData,
  });
}

export async function importHrTpBankFile(file: File): Promise<ImportHrTpBankResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ImportHrTpBankResult>('/reconciliation/import-hr-tpbank', {
    method: 'POST',
    body: formData,
  });
}

export async function listReconciliationHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<ReconciliationHistoryListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<ReconciliationHistoryListResponse>(`/reconciliation/history?${query.toString()}`);
}

export async function downloadReconciliationHistoryFile(id: string, filename: string): Promise<void> {
  return downloadFile(`/reconciliation/history/${id}/download`, filename);
}

export async function downloadReconciliationResultFile(id: string, filename: string): Promise<void> {
  return downloadFile(`/reconciliation/history/${id}/download-result`, filename);
}



