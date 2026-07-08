import type { Checklist } from '../types/collaborator';

export interface ChecklistItem {
  key: string;
  label: string;
  done: boolean;
}

export function getChecklistItems(checklist: Checklist): ChecklistItem[] {
  return [
    { key: 'idCard', label: 'CCCD', done: checklist.submittedIdCard },
    {
      key: 'serviceContract',
      label: 'Hợp đồng dịch vụ',
      done: checklist.serviceContracts.some((period) => Boolean(period.startDate)),
    },
    { key: 'taxCommitment', label: 'Cam kết thuế', done: checklist.submittedTaxCommitment },
    { key: 'liquidation', label: 'Biên bản thanh lý', done: Boolean(checklist.liquidationDate) },
    { key: 'cv', label: 'CV', done: checklist.submittedCV },
    { key: 'residenceInfo', label: 'Thông tin cư trú', done: checklist.submittedResidenceInfo },
    { key: 'degree', label: 'Bằng cấp', done: checklist.submittedDegree },
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
