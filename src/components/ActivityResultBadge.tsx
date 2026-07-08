import type { ActivityResult } from '../types/activityLog';
import { resultLabel } from '../utils/activityLog';

const STYLES: Record<ActivityResult, string> = {
  success: 'bg-accent/10 text-accent',
  fail: 'bg-warning/10 text-warning',
  error: 'bg-danger/10 text-danger',
};

const DOT_STYLES: Record<ActivityResult, string> = {
  success: 'bg-accent',
  fail: 'bg-warning',
  error: 'bg-danger',
};

export default function ActivityResultBadge({ result }: { result: ActivityResult }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STYLES[result]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[result]}`} />
      {resultLabel(result)}
    </span>
  );
}
