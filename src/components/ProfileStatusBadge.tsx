import type { Checklist } from '../types/collaborator';
import { getChecklistProgress, isChecklistComplete } from '../utils/checklist';

export default function ProfileStatusBadge({ checklist }: { checklist: Checklist }) {
  const complete = isChecklistComplete(checklist);
  const { done, total } = getChecklistProgress(checklist);

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        complete ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${complete ? 'bg-accent' : 'bg-warning'}`} />
      {complete ? 'Đã nộp đủ' : `Còn thiếu (${done}/${total})`}
    </span>
  );
}
