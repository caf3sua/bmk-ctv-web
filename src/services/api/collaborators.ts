import type { Collaborator, CollaboratorInput } from '../../types/collaborator';
import { apiFetch, downloadFile } from './client';

export interface ImportResult {
  updatedCount: number;
  updated: string[];
  createdCount: number;
  created: string[];
  dateErrorCount: number;
  dateErrors: string[];
}

export async function listCollaborators(): Promise<Collaborator[]> {
  return apiFetch<Collaborator[]>('/collaborators');
}

export async function getCollaborator(employeeCode: string): Promise<Collaborator> {
  return apiFetch<Collaborator>(`/collaborators/${encodeURIComponent(employeeCode)}`);
}

export async function createCollaborator(input: CollaboratorInput): Promise<Collaborator> {
  return apiFetch<Collaborator>('/collaborators', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCollaborator(
  originalEmployeeCode: string,
  input: CollaboratorInput,
): Promise<Collaborator> {
  return apiFetch<Collaborator>(`/collaborators/${encodeURIComponent(originalEmployeeCode)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteCollaborator(employeeCode: string): Promise<void> {
  return apiFetch<void>(`/collaborators/${encodeURIComponent(employeeCode)}`, {
    method: 'DELETE',
  });
}

export async function downloadImportTemplate(): Promise<void> {
  return downloadFile('/collaborators/template', 'mau_import_checklist_ctv.xlsx');
}

export async function exportCollaborators(): Promise<void> {
  return downloadFile('/collaborators/export', 'danh_sach_ctv.xlsx');
}

export async function importCollaborators(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  return apiFetch<ImportResult>('/collaborators/import', {
    method: 'POST',
    body: formData,
  });
}
