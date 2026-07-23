const COLOR_CLASSES = [
  'bg-green-light text-primary',
  'bg-gold-lightest text-gold',
  'bg-ceramic text-primary-dark',
  'bg-amber-100 text-amber-800',
  'bg-orange-100 text-orange-800',
  'bg-slate-200 text-slate-800',
];

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export default function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const colorClass = COLOR_CLASSES[hashString(name) % COLOR_CLASSES.length];

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${colorClass} ${SIZE_CLASSES[size]}`}
    >
      {getInitials(name)}
    </div>
  );
}
