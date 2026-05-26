"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
} from "recharts";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { KpiMetric } from "@/types/dashboard";

export function KpiCard({ metric, index }: Readonly<{ metric: KpiMetric; index: number }>) {
  const Icon = metric.icon;
  const TrendIcon = metric.trendDirection === "up" ? ArrowUpRight : ArrowDownRight;

  return (
    <DashboardCard delay={index * 0.05}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#6B7280]">{metric.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-normal text-[#111827]">{metric.value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#19C93B]/10 text-[#19C93B] shadow-[0_0_24px_rgba(25,201,59,0.16)]">
          <Icon size={22} />
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="flex items-center gap-1 rounded-full bg-[#19C93B]/10 px-3 py-1 text-xs font-semibold text-[#087B25]">
          <TrendIcon size={14} />
          {metric.trend}
        </div>
        <div className="h-12 w-28">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={metric.sparkline}>
              <defs>
                <linearGradient id={`kpiGradient-${index}`} x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#19C93B" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#19C93B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                dataKey="value"
                fill={`url(#kpiGradient-${index})`}
                stroke="#19C93B"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </DashboardCard>
  );
}

