interface KPICardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
  valueColor?: string;
  subtitle?: string;
  trend?: { value: number; label: string };
}

export default function KPICard({ label, value, icon, accent = "text-[#E8501A]", valueColor, subtitle, trend }: KPICardProps) {
  return (
    <div className="rounded-xl bg-[#0F0F11] border border-[#27272A] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={accent}>{icon}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${valueColor || "text-[#FAFAFA]"}`}>{value}</p>
      <p className="text-xs text-[#A1A1AA] mt-1">{label}</p>
      {subtitle && <p className="text-[11px] text-[#52525B] mt-0.5">{subtitle}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-1.5 text-[11px] ${trend.value > 0 ? "text-[#22C55E]" : trend.value < 0 ? "text-[#EF4444]" : "text-[#52525B]"}`}>
          {trend.value > 0 ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg>
          ) : trend.value < 0 ? (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" /></svg>
          ) : null}
          <span>{trend.label}</span>
        </div>
      )}
    </div>
  );
}
