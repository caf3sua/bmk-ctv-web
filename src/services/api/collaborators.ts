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

export interface UploadDocumentResult {
  filename: string;
  status: 'success' | 'fail';
  message: string;
  employeeCode: string | null;
}

export interface UploadUrlResult {
  filename: string;
  status: 'success' | 'fail';
  message?: string;
  uploadUrl?: string;
  s3Key?: string;
  employeeCode?: string;
}

export async function uploadCollaboratorDocument(file: File, docType: string): Promise<UploadDocumentResult> {
  // 1. Get presigned upload URL
  let urlRes: UploadUrlResult;
  try {
    urlRes = await apiFetch<UploadUrlResult>('/collaborators/documents/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        doc_type: docType
      })
    });
  } catch (err: any) {
    return {
      filename: file.name,
      status: 'fail',
      message: err.message || 'Lỗi khi yêu cầu đường dẫn tải lên từ máy chủ',
      employeeCode: null
    };
  }

  if (urlRes.status === 'fail') {
    return {
      filename: file.name,
      status: 'fail',
      message: urlRes.message || 'Không thể tạo đường dẫn tải lên',
      employeeCode: urlRes.employeeCode || null
    };
  }

  if (!urlRes.uploadUrl || !urlRes.s3Key || !urlRes.employeeCode) {
    return {
      filename: file.name,
      status: 'fail',
      message: 'Không nhận được đầy đủ thông tin đường dẫn tải lên từ máy chủ',
      employeeCode: urlRes.employeeCode || null
    };
  }

  // 2. Upload file directly to S3 via PUT
  try {
    const s3Response = await fetch(urlRes.uploadUrl, {
      method: 'PUT',
      body: file,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': file.type || 'application/octet-stream'
      }
    });

    if (!s3Response.ok) {
      throw new Error(`S3 returned HTTP ${s3Response.status}`);
    }
  } catch (err: any) {
    return {
      filename: file.name,
      status: 'fail',
      message: `Tải tệp tin lên S3 thất bại: ${err.message || String(err)}`,
      employeeCode: urlRes.employeeCode
    };
  }

  // 3. Confirm upload with backend
  try {
    const confirmRes = await apiFetch<UploadDocumentResult>('/collaborators/documents/upload-confirm', {
      method: 'POST',
      body: JSON.stringify({
        filename: file.name,
        doc_type: docType,
        employee_code: urlRes.employeeCode,
        s3_key: urlRes.s3Key
      })
    });
    return confirmRes;
  } catch (err: any) {
    return {
      filename: file.name,
      status: 'fail',
      message: `Xác nhận tải lên với máy chủ thất bại: ${err.message || String(err)}`,
      employeeCode: urlRes.employeeCode
    };
  }
}

export async function downloadCollaboratorDocument(
  employeeCode: string,
  docType: string,
  filename: string,
  fileKey?: string,
): Promise<void> {
  const query = fileKey ? `?file_key=${encodeURIComponent(fileKey)}` : '';
  return downloadFile(
    `/collaborators/${encodeURIComponent(employeeCode)}/documents/${encodeURIComponent(docType)}/download${query}`,
    filename,
  );
}
