import type { Checklist } from '../types/collaborator';
import { getChecklistItems, getChecklistProgress } from '../utils/checklist';

interface ProfileStatusBadgeProps {
  checklist: Checklist;
  showText?: boolean;
}

export default function ProfileStatusBadge({ checklist, showText = true }: ProfileStatusBadgeProps) {
  const items = getChecklistItems(checklist || ({} as Checklist));
  const { done, total } = getChecklistProgress(checklist || ({} as Checklist));
  const totalCount = total || 4;
  const percent = Math.round((done / totalCount) * 100);

  // user nộp đủ 4/4 100% thì progress bar màu xanh green, nếu mới nộp 1 hoặc 2 thì màu đỏ, nộp 3 thì màu blue
  let activeColorClass = 'bg-slate-300';
  let textColorClass = 'text-slate-400';

  if (done >= 4) {
    activeColorClass = 'bg-emerald-600';
    textColorClass = 'text-emerald-600';
  } else if (done === 3) {
    activeColorClass = 'bg-blue-600';
    textColorClass = 'text-blue-600';
  } else if (done === 1 || done === 2) {
    activeColorClass = 'bg-red-500';
    textColorClass = 'text-red-500';
  }

  const tooltipLines = [
    `Tiến độ hồ sơ: ${done}/${totalCount} (${percent}%)`,
    ...items.map((it) => `• ${it.label}: ${it.done ? 'Đã nộp' : 'Chưa nộp'}`),
  ];

  return (
    <div
      className="inline-flex items-center gap-2 select-none cursor-default"
      title={tooltipLines.join('\n')}
    >
      {/* 4 mẩu progress bar (mỗi mẩu 25%) */}
      <div
        className="flex items-center gap-[3px]"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {[0, 1, 2, 3].map((index) => {
          const isFilled = index < done;
          return (
            <span
              key={index}
              className={`h-[9px] w-[18px] rounded-[2px] transition-colors ${
                isFilled ? activeColorClass : 'bg-slate-200'
              }`}
            />
          );
        })}
      </div>

      {/* Hiển thị % tiến độ */}
      {showText && (
        <span className={`text-xs font-bold font-mono tracking-tight min-w-[32px] ${textColorClass}`}>
          {percent}%
        </span>
      )}
    </div>
  );
}

