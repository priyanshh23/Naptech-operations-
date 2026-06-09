import { Bell, Boxes, CheckCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";

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
          <h2 className="mt-1 text-lg font-semibold text-[#111827] dark:text-white">Recent Activity</h2>
        </div>
        <Link className="text-sm font-semibold text-[#19C93B]" href="/notifications">View all</Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = activityIcons[item.type];
          return (
            <div className="relative rounded-2xl bg-slate-50 p-3 sm:p-4" key={`${item.title}-${item.time}`}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#19C93B]/10 text-[#19C93B]">
                  <Icon size={19} />
                </div>
                <span className="text-xs font-semibold text-[#6B7280]">{item.time}</span>
              </div>
              <p className="break-words text-sm font-semibold text-[#111827] sm:text-base">{item.title}</p>
              <p className="mt-2 break-words text-sm leading-6 text-[#6B7280]">{item.description}</p>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
