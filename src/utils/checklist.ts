import type { Checklist } from '../types/collaborator';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export function getChecklistItems(checklist: Checklist): ChecklistItem[] {
  const cccd = checklist.cccd || { checked: false, file: null };
  const ckt = checklist.ckt || { checked: false, file: null };
  const hddv = checklist.hddv || { contract_date: [], files: [] };
  const bbtl = checklist.bbtl || { date: null, file: null };

  return [
    { key: 'idCard', label: 'CCCD', done: cccd.checked || Boolean(cccd.file) },
    {
      key: 'serviceContract',
      label: 'Hợp đồng dịch vụ',
      done:
        (hddv.contract_date || []).some((period) => Boolean(period.startDate)) ||
        (hddv.files || []).length > 0,
    },
    { key: 'taxCommitment', label: 'Cam kết thuế', done: ckt.checked || Boolean(ckt.file) },
    {
      key: 'liquidation',
      label: 'Biên bản thanh lý',
      done: Boolean(bbtl.date) || Boolean(bbtl.file),
    },
  ];
}

export function getMissingItems(checklist: Checklist): ChecklistItem[] {
  return getChecklistItems(checklist).filter((item) => !item.done);
}

export function isChecklistComplete(checklist: Checklist): boolean {
  return getMissingItems(checklist).length === 0;
}

export function getChecklistProgress(checklist: Checklist): { done: number; total: number } {
  const items = getChecklistItems(checklist);
  return { done: items.filter((item) => item.done).length, total: items.length };
}

export interface UploadedFileMeta {
  filename: string;
  uploadDate: string | null;
}

export function parseUploadedFileMeta(fileKey: string, defaultName?: string): UploadedFileMeta {
  const parts = fileKey.split('_');
  let filename = defaultName || fileKey;
  let uploadDate: string | null = null;

  // Expected format: documents/contracts/{yyyyMM}/{employee_code}_{doc_type}_{timestamp}_{filename}
  if (parts.length >= 4 && /^\d{9,12}$/.test(parts[2])) {
    const timestampSec = parseInt(parts[2], 10);
    const date = new Date(timestampSec * 1000);
    if (!Number.isNaN(date.getTime())) {
      const dayMonthYear = date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const time = date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      uploadDate = `${time} ${dayMonthYear}`;
    }
    filename = parts.slice(3).join('_') || filename;
  } else {
    filename = parts[parts.length - 1] || filename;
  }

  return { filename, uploadDate };
}

