import { DashboardCard } from "@/components/dashboard/dashboard-card";
import Link from "next/link";

export function ProductionOutputWidget({
  percentage,
  target,
  achieved,
  remaining,
}: Readonly<{
  percentage: number;
  target: number;
  achieved: number;
  remaining: number;
}>) {
  return (
    <DashboardCard delay={0.32}>
      <div className="flex items-center justify-between">
        <h2 className="mt-1 text-lg font-semibold text-[#111827] dark-dashboard:text-white">Production Target</h2>
        <Link className="text-sm font-semibold text-[#19C93B]" href="/production">View all</Link>
      </div>

      <div className="mt-8 flex items-center justify-center">
        <div
          className="grid h-44 w-44 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#19C93B ${percentage * 3.6}deg, #E5E7EB 0deg)`,
          }}
        >
          <div className="grid h-32 w-32 place-items-center rounded-full bg-white shadow-inner">
            <div className="text-center">
              <p className="text-3xl font-semibold text-[#111827]">{percentage}%</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">Complete</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <OutputStat label="Target" value={target} />
        <OutputStat label="Achieved" value={achieved} />
        <OutputStat label="Remaining" value={remaining} />
      </div>
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-center text-sm">
        <span className="font-semibold text-[#111827]">Defective</span>
        <span className="ml-2 text-[#6B7280]">18 (1.4%)</span>
      </div>
    </DashboardCard>
  );
}

function OutputStat({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-lg font-semibold text-[#111827]">{value}</p>
      <p className="mt-1 text-xs text-[#6B7280]">{label}</p>
    </div>
  );
}
