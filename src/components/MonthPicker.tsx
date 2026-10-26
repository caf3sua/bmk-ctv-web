import { useState, useRef, useEffect } from 'react';

export interface MonthPickerProps {
  value: string; // Format: 'YYYY-MM', e.g. '2026-10'
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  'Tháng 1',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12',
];

export default function MonthPicker({
  value,
  onChange,
  className = '',
  disabled = false,
}: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial year and month
  const now = new Date();
  const currentActualYear = now.getFullYear();
  const currentActualMonth = now.getMonth() + 1;

  let initYear = currentActualYear;
  let initMonth = currentActualMonth;
  if (value && value.includes('-')) {
    const parts = value.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      initYear = y;
      initMonth = m;
    }
  }

  // Active view year in the picker
  const [viewYear, setViewYear] = useState<number>(initYear);

  // Sync view year when value changes from outside
  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      const y = parseInt(parts[0], 10);
      if (!isNaN(y)) {
        setViewYear(y);
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectMonth = (monthNum: number) => {
    const formatted = `${viewYear}-${String(monthNum).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  const handleQuickCurrentMonth = () => {
    setViewYear(currentActualYear);
    const formatted = `${currentActualYear}-${String(currentActualMonth).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Label display
  const displayLabel = (() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      const y = parts[0];
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) {
        return `Tháng ${String(m).padStart(2, '0')}/${y}`;
      }
    }
    return `Tháng ${String(initMonth).padStart(2, '0')}/${initYear}`;
  })();

  const isSelected = (monthNum: number) => {
    if (!value || !value.includes('-')) return false;
    const parts = value.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return y === viewYear && m === monthNum;
  };

  const isTodayMonth = (monthNum: number) => {
    return viewYear === currentActualYear && monthNum === currentActualMonth;
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`group inline-flex items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2 text-xs font-semibold transition-all shadow-xs ${
          isOpen
            ? 'border-accent ring-2 ring-accent/15 text-accent shadow-sm'
            : 'border-slate-300 text-slate-800 hover:border-accent/80 hover:bg-slate-50/60'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center text-accent shrink-0">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <span className="font-semibold text-slate-800">{displayLabel}</span>
        </div>

        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-accent' : 'group-hover:text-slate-600'
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 z-50 w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {/* Header with Year Selector */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Năm trước"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800">
              <span>Năm</span>
              <span className="text-accent text-base">{viewYear}</span>
            </div>

            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Năm sau"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 12 Months Grid (4 rows x 3 columns) */}
          <div className="grid grid-cols-3 gap-2 py-3">
            {MONTH_NAMES.map((name, index) => {
              const monthNum = index + 1;
              const selected = isSelected(monthNum);
              const isToday = isTodayMonth(monthNum);

              return (
                <button
                  key={monthNum}
                  type="button"
                  onClick={() => handleSelectMonth(monthNum)}
                  className={`relative py-2 px-2 text-xs font-semibold rounded-xl transition-all cursor-pointer text-center ${
                    selected
                      ? 'bg-accent text-white shadow-xs font-bold'
                      : isToday
                      ? 'bg-accent/10 text-accent font-bold hover:bg-accent/20'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span>{name}</span>
                  {isToday && !selected && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Action */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleQuickCurrentMonth}
              className="font-medium text-accent hover:underline cursor-pointer flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Tháng hiện tại</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
