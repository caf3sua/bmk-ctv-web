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
