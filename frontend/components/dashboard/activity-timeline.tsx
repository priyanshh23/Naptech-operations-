import { Bell, Boxes, CheckCircle2, ClipboardList } from "lucide-react";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { RecentActivity } from "@/types/dashboard";

const activityIcons = {
  inventory: Boxes,
  production: CheckCircle2,
  alert: Bell,
  task: ClipboardList,
};

export function ActivityTimeline({ items }: Readonly<{ items: RecentActivity[] }>) {
  return (
    <DashboardCard className="lg:col-span-12" delay={0.42}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Timeline</p>
          <h2 className="mt-1 text-xl font-semibold text-[#111827]">Recent Activity</h2>
        </div>
        <span className="text-sm font-medium text-[#6B7280]">Last 4 operational events</span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = activityIcons[item.type];
          return (
            <div className="relative rounded-3xl bg-slate-50 p-4" key={`${item.title}-${item.time}`}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#19C93B]/10 text-[#19C93B]">
                  <Icon size={19} />
                </div>
                <span className="text-xs font-semibold text-[#6B7280]">{item.time}</span>
              </div>
              <p className="font-semibold text-[#111827]">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#6B7280]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}

