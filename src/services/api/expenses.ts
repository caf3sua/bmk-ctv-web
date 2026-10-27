import { apiFetch, downloadFile } from './client';
import type {
  ExpenseStatsResponse,
  ExpenseImportResponse,
  PaginatedExpenseDetails,
  PaginatedExpenseCollaborators,
  CollaboratorExpenseDetailResponse,
} from '../../types/expense';

export interface ExpenseDetailsFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  period?: string;
  workLocation?: string;
}

export interface ExpenseCollaboratorsFilter {
  page?: number;
  pageSize?: number;
  search?: string;
}

export async function getExpenseStats(): Promise<ExpenseStatsResponse> {
  return apiFetch<ExpenseStatsResponse>('/expenses/stats');
}

export async function listExpensePeriods(): Promise<{ periods: string[] }> {
  return apiFetch<{ periods: string[] }>('/expenses/periods');
}

export async function listExpenseLocations(): Promise<{ locations: string[] }> {
  return apiFetch<{ locations: string[] }>('/expenses/locations');
}

export async function listExpenseDetails(
  params: ExpenseDetailsFilter = {}
): Promise<PaginatedExpenseDetails> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());
  if (params.period?.trim()) query.set('period', params.period.trim());
  if (params.workLocation?.trim()) query.set('work_location', params.workLocation.trim());

  const qs = query.toString();
  return apiFetch<PaginatedExpenseDetails>(`/expenses/details${qs ? `?${qs}` : ''}`);
}

export async function listExpenseCollaborators(
  params: ExpenseCollaboratorsFilter = {}
): Promise<PaginatedExpenseCollaborators> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('page_size', String(params.pageSize));
  if (params.search?.trim()) query.set('search', params.search.trim());

  const qs = query.toString();
  return apiFetch<PaginatedExpenseCollaborators>(`/expenses/collaborators${qs ? `?${qs}` : ''}`);
}

export async function downloadExpenseTemplate(): Promise<void> {
  return downloadFile('/expenses/template', 'import_thanh_toan_phi_CTV.xlsx');
}

export async function exportExpenseData(params: {
  mode?: 'details' | 'collaborators';
  period?: string;
  workLocation?: string;
  search?: string;
}): Promise<void> {
  const query = new URLSearchParams();
  if (params.mode) query.set('mode', params.mode);
  if (params.period?.trim()) query.set('period', params.period.trim());
  if (params.workLocation?.trim()) query.set('work_location', params.workLocation.trim());
  if (params.search?.trim()) query.set('search', params.search.trim());

  const qs = query.toString();
  const filename = `bao_cao_chi_phi_ctv_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return downloadFile(`/expenses/export${qs ? `?${qs}` : ''}`, filename);
}

export async function exportMonthlyExpenseData(year: number): Promise<void> {
  const filename = `bao_cao_chi_phi_ctv_theo_thang_${year}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return downloadFile(`/expenses/export-monthly?year=${year}`, filename);
}

export async function importExpenseFile(
  file: File,
  period: string
): Promise<ExpenseImportResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('period', period);
  return apiFetch<ExpenseImportResponse>('/expenses/import', {
    method: 'POST',
    body: formData,
  });
}

export async function getCollaboratorExpenseDetail(
  employeeCode: string
): Promise<CollaboratorExpenseDetailResponse> {
  return apiFetch<CollaboratorExpenseDetailResponse>(
    `/expenses/collaborators/${encodeURIComponent(employeeCode)}`
  );
}

