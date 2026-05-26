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

export function InventoryOverview({ data }: Readonly<{ data: InventoryCategory[] }>) {
  return (
    <DashboardCard className="overflow-hidden lg:col-span-5" delay={0.18}>
      <PanelTitle href="/inventory" title="Inventory Overview" />
      <div className="mt-4 grid gap-4 2xl:grid-cols-[210px_1fr]">
        <div className="relative h-52 min-w-0">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={58} outerRadius={84} paddingAngle={4}>
                {data.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="text-xs text-[#6B7280]">Total Items</p>
              <p className="text-xl font-semibold text-[#111827]">2,458</p>
            </div>
          </div>
        </div>
        <div className="grid min-w-0 gap-2 self-center sm:grid-cols-2 2xl:grid-cols-1">
          {data.map((item) => (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2" key={item.name}>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate text-xs font-semibold text-[#111827]">{item.name}</span>
              </div>
              <span className="shrink-0 text-xs font-semibold text-[#6B7280]">
                {Math.round((item.value / 100) * 2458).toLocaleString("en-IN")} ({item.value}%)
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
      <div className="mt-5 h-64">
        <ResponsiveContainer height="100%" width="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="plannedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#07111A" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#07111A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="completedGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="5%" stopColor="#19C93B" stopOpacity={0.32} />
                <stop offset="95%" stopColor="#19C93B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 6" vertical={false} />
            <XAxis axisLine={false} dataKey="shift" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
            <Tooltip />
            <Area dataKey="planned" fill="url(#plannedGradient)" stroke="#07111A" strokeWidth={2} type="monotone" />
            <Area
              dataKey="completed"
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

function PanelTitle({ href, title }: Readonly<{ href: string; title: string }>) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-normal text-[#111827] dark-dashboard:text-white">{title}</h2>
      <Link className="text-sm font-semibold text-[#19C93B]" href={href}>
        View all
      </Link>
    </div>
  );
}
