import { AlertTriangle, Clock3, Wrench } from "lucide-react";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";
import type { AlertItem } from "@/types/dashboard";

const alertMeta = {
  low_stock: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", dot: "bg-red-500" },
  delay: { icon: Clock3, color: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" },
  maintenance: { icon: Wrench, color: "text-[#19C93B]", bg: "bg-[#19C93B]/10", dot: "bg-[#19C93B]" },
};

export function AlertsPanel({ alerts }: Readonly<{ alerts: AlertItem[] }>) {
  return (
    <DashboardCard delay={0.28}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Alerts</p>
          <h2 className="mt-1 text-lg font-semibold text-[#111827] dark-dashboard:text-white">Recent Alerts</h2>
        </div>
        <Link className="text-sm font-semibold text-[#19C93B]" href="/notifications">View all</Link>
      </div>

      <div className="space-y-3">
        {alerts.map((alert) => {
          const meta = alertMeta[alert.type];
          const Icon = meta.icon;
          return (
            <div className="rounded-2xl bg-slate-50 p-4" key={alert.title}>
              <div className="flex gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", meta.bg, meta.color)}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#111827] dark-dashboard:text-white">{alert.title}</p>
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} />
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#6B7280]">{alert.description}</p>
                  <p className="mt-2 text-xs font-medium text-slate-400">{alert.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
