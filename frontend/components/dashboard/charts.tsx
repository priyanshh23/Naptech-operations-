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

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import type { InventoryCategory, ProductionPoint } from "@/types/dashboard";

export function InventoryOverview({ data }: Readonly<{ data: InventoryCategory[] }>) {
  return (
    <DashboardCard className="lg:col-span-5" delay={0.18}>
      <PanelTitle eyebrow="Inventory" title="Category Overview" />
      <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={68} outerRadius={98} paddingAngle={4}>
                {data.map((entry) => (
                  <Cell fill={entry.color} key={entry.name} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-4 self-center">
          {data.map((item) => (
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3" key={item.name}>
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                <span className="text-sm font-semibold text-[#111827]">{item.name}</span>
              </div>
              <span className="text-sm font-semibold text-[#6B7280]">{item.value}%</span>
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
      <PanelTitle eyebrow="Production" title="Planned vs Completed" />
      <div className="mt-6 h-72">
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

function PanelTitle({ eyebrow, title }: Readonly<{ eyebrow: string; title: string }>) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-semibold tracking-normal text-[#111827]">{title}</h2>
    </div>
  );
}

