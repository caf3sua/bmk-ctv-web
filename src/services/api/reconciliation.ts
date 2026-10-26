import type {
  CalculateContractExpiryResult,
  ExpiringContractsHistoryListResponse,
  ExpiringContractsStatsResponse,
  ImportExpiringContractsResult,
  ImportHrBmkResult,
  ImportHrTpBankResult,
  ListExpiringContractsParams,
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

export async function getExpiringContractsStats(days: number = 30): Promise<ExpiringContractsStatsResponse> {
  return apiFetch<ExpiringContractsStatsResponse>(`/reconciliation/expiring-contracts/stats?days=${days}`);
}

export async function listExpiringContracts(
  params?: ListExpiringContractsParams
): Promise<ReconciliationListResponse> {
  const query = new URLSearchParams();
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.days) query.set('days', String(params.days));
  if (params?.is_calculate_expired !== undefined) query.set('is_calculate_expired', String(params.is_calculate_expired));
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('page_size', String(params.pageSize));

  const qs = query.toString();
  return apiFetch<ReconciliationListResponse>(`/reconciliation/expiring-contracts${qs ? `?${qs}` : ''}`);
}

export async function downloadExpiringContractsTemplate(): Promise<void> {
  return downloadFile('/reconciliation/template-expiring-contracts', 'template_bmk_ngay_dao_han.xlsx');
}

export async function importExpiringContractsFile(file: File): Promise<ImportExpiringContractsResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ImportExpiringContractsResult>('/reconciliation/import-expiring-contracts', {
    method: 'POST',
    body: formData,
  });
}

export async function listExpiringContractsHistory(
  page: number = 1,
  pageSize: number = 20
): Promise<ExpiringContractsHistoryListResponse> {
  const query = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  return apiFetch<ExpiringContractsHistoryListResponse>(`/reconciliation/expiring-contracts/history?${query.toString()}`);
}

export async function downloadExpiringContractsHistoryFile(id: string, filename: string): Promise<void> {
  return downloadFile(`/reconciliation/expiring-contracts/history/${id}/download`, filename);
}

export async function downloadExpiringContractsResultFile(id: string, filename: string): Promise<void> {
  return downloadFile(`/reconciliation/expiring-contracts/history/${id}/download-result`, filename);
}

export async function calculateContractExpiry(month: string): Promise<CalculateContractExpiryResult> {
  return apiFetch<CalculateContractExpiryResult>('/reconciliation/calculate-contract-expiry', {
    method: 'POST',
    body: JSON.stringify({ month }),
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export async function exportExpiringContractsByMonth(month: string): Promise<void> {
  const [y, m] = month.split('-');
  return downloadFile(
    `/reconciliation/export-expiring-contracts?month=${encodeURIComponent(month)}`,
    `danh_sach_dao_han_thang_${m}_${y}.xlsx`
  );
}



