export default function UserStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? 'bg-accent/10 text-accent' : 'bg-danger/10 text-danger'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-accent' : 'bg-danger'}`} />
      {active ? 'Đang hoạt động' : 'Đã khóa'}
    </span>
  );
}
