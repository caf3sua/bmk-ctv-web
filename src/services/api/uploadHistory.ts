import type { UploadHistory } from '../../types/uploadHistory';
import { apiFetch, downloadFile } from './client';

export async function listUploadHistories(): Promise<UploadHistory[]> {
  return apiFetch<UploadHistory[]>('/upload-history');
}

export async function downloadUploadHistoryFile(id: string, filename: string): Promise<void> {
  return downloadFile(`/upload-history/${id}/download`, filename);
}
