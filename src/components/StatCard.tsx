import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="rounded-card bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink/50">{label}</span>
        <Icon className={accent ? "h-4 w-4 text-gold-400" : "h-4 w-4 text-petrol-400"} />
      </div>
      <p className="mt-2 font-display text-3xl font-semibold text-petrol-700">{value}</p>
    </div>
  );
}
