import { DashboardCard } from "@/components/dashboard/dashboard-card";

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
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Daily Output</p>
        <h2 className="mt-1 text-xl font-semibold text-[#111827]">Production Target</h2>
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
              <p className="text-4xl font-semibold text-[#111827]">{percentage}%</p>
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

