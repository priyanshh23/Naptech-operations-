"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { InventoryCategory, ProductionPoint } from "@/types/dashboard";

export function InventoryOverview({ data, totalBalance }: Readonly<{ data: InventoryCategory[]; totalBalance: number }>) {
  return (
    <DashboardCard className="overflow-hidden lg:col-span-5" delay={0.18}>
      <PanelTitle href="/inventory-logs" title="Inventory Overview" />
      <div className="mt-4 grid gap-4 xl:grid-cols-[220px_1fr]">
        <div className="relative h-44 min-w-0 sm:h-52">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                animationDuration={650}
                data={data}
                dataKey="value"
                innerRadius={58}
                outerRadius={84}
                paddingAngle={4}
              >
                {data.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip suffix="%" />} cursor={false} wrapperStyle={{ outline: "none" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-xs text-[#6B7280]">Total Balance</p>
              <p className="text-lg font-semibold text-[#111827] dark:text-white">{totalBalance.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 self-center sm:grid-cols-2 xl:grid-cols-1">
          {data.map((item) => (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2" key={item.name}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate text-xs font-semibold text-[#111827]">{item.name}</span>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#6B7280]">
                {Math.round((item.value / 100) * totalBalance).toLocaleString("en-IN")} ({item.value}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}

export function ProductionOverview({ data }: Readonly<{ data: ProductionPoint[] }>) {
  return (
    <DashboardCard className="lg:col-span-7" delay={0.22}>
      <PanelTitle href="/production" title="Production Overview" />
      <div className="mt-4 h-52 sm:mt-5 sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="plannedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.26} />
                <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#A3FF12" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#19C93B" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 6" vertical={false} />
            <XAxis axisLine={false} dataKey="shift" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#38BDF8", strokeDasharray: "4 4" }} />
            <Area
              activeDot={{ fill: "#38BDF8", r: 5, stroke: "#E0F2FE", strokeWidth: 2 }}
              animationBegin={120}
              animationDuration={900}
              animationEasing="ease-out"
              dataKey="planned"
              dot={false}
              fill="url(#plannedGradient)"
              stroke="#38BDF8"
              strokeWidth={3}
              type="monotone"
            />
            <Area
              activeDot={{ fill: "#19C93B", r: 5, stroke: "#ECFCCB", strokeWidth: 2 }}
              animationBegin={260}
              animationDuration={1050}
              animationEasing="ease-out"
              dataKey="completed"
              dot={false}
              fill="url(#completedGradient)"
              stroke="#19C93B"
              strokeWidth={3}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
}

type TooltipPayload = {
  color?: string;
  name?: string | number;
  value?: string | number;
};

function ChartTooltip({
  active,
  label,
  payload,
  suffix = "",
}: Readonly<{
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayload[];
  suffix?: string;
}>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#07111A]/95">
      {label ? <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p> : null}
      <div className="space-y-1">
        {payload.map((item) => (
          <div className="flex items-center gap-2" key={`${item.name}-${item.value}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: item.color ?? "#19C93B" }} />
            <span className="text-slate-500 dark:text-slate-300">{item.name}</span>
            <span className="font-semibold text-slate-950 dark:text-white">
              {item.value}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PanelTitle({ href, title }: Readonly<{ href: string; title: string }>) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold tracking-normal text-[#111827] dark:text-white sm:text-lg">{title}</h2>
      <Link className="text-sm font-semibold text-[#19C93B]" href={href}>
        View all
      </Link>
    </div>
  );
}
