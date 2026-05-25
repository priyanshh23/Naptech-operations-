"use client";

import { AlertTriangle, Boxes, CheckCircle2, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/app-shell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { formatDateTime, titleCase } from "@/lib/format";
import { dashboardSummary, inventoryItems, inventoryLogs, productionTasks } from "@/lib/mock-data";

const statusColors = {
  pending: "#64748b",
  in_progress: "#0891b2",
  delayed: "#dc2626",
  completed: "#16a34a",
};

export default function DashboardPage() {
  const inventoryChart = inventoryItems.map((item) => ({
    name: item.product_name,
    stock: item.quantity,
    minimum: item.minimum_stock,
  }));

  const productionChart = Object.entries(dashboardSummary.production_summary).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <AppShell>
      <PageHeader
        description="Live operational view for inventory health, production status, and shift-level movement."
        title="Dashboard"
      />

      <section className="metric-grid">
        <MetricCard icon={<Boxes size={22} />} label="Total Inventory" value={dashboardSummary.total_inventory} />
        <MetricCard
          icon={<AlertTriangle size={22} />}
          label="Low Stock Items"
          tone="warning"
          value={dashboardSummary.low_stock_count}
        />
        <MetricCard
          icon={<ClipboardList size={22} />}
          label="Active Tasks"
          tone="info"
          value={dashboardSummary.active_tasks}
        />
        <MetricCard
          icon={<CheckCircle2 size={22} />}
          label="Completed Tasks"
          tone="success"
          value={dashboardSummary.completed_tasks}
        />
      </section>

      <section className="data-grid mt-6">
        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-950">Inventory Overview</h2>
            <p className="text-sm text-muted-foreground">Current quantity versus minimum stock.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={inventoryChart}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="stock" fill="#0891b2" radius={[6, 6, 0, 0]} />
                <Bar dataKey="minimum" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-950">Production Analytics</h2>
            <p className="text-sm text-muted-foreground">Task distribution by current status.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer height="100%" width="100%">
              <PieChart>
                <Pie data={productionChart} dataKey="value" innerRadius={58} outerRadius={96} paddingAngle={3}>
                  {productionChart.map((entry) => (
                    <Cell fill={statusColors[entry.name as keyof typeof statusColors]} key={entry.name} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, titleCase(String(name))]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {productionChart.map((item) => (
              <div className="flex items-center gap-2 text-sm text-slate-700" key={item.name}>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: statusColors[item.name as keyof typeof statusColors] }}
                />
                {titleCase(item.name)}: {item.value}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="data-grid mt-6">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-950">Recent Stock Movement</h2>
          <div className="space-y-3">
            {inventoryLogs.slice(0, 4).map((log) => (
              <div className="flex items-center justify-between border-b border-border pb-3" key={log.id}>
                <div>
                  <p className="text-sm font-medium text-slate-900">{titleCase(log.action_type)}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</p>
                </div>
                <Badge tone={log.quantity_changed < 0 ? "danger" : "success"}>
                  {log.quantity_changed > 0 ? "+" : ""}
                  {log.quantity_changed}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-950">Active Production Tasks</h2>
          <div className="space-y-3">
            {productionTasks
              .filter((task) => task.status !== "completed")
              .slice(0, 4)
              .map((task) => (
                <div className="flex items-center justify-between border-b border-border pb-3" key={task.id}>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{task.task_name}</p>
                    <p className="text-xs text-muted-foreground">{task.assigned_worker}</p>
                  </div>
                  <Badge tone={task.status === "delayed" ? "danger" : "info"}>{titleCase(task.status)}</Badge>
                </div>
              ))}
          </div>
        </Card>
      </section>
    </AppShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = "neutral",
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "neutral" | "warning" | "success" | "info";
}>) {
  const toneClass = {
    neutral: "bg-slate-100 text-slate-700",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
    info: "bg-cyan-50 text-cyan-700",
  }[tone];

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${toneClass}`}>{icon}</div>
      </div>
    </Card>
  );
}
