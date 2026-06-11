"use client";

import { Activity, AlertTriangle, Boxes, CalendarDays, CheckCircle2, Download, Factory, FileText, Loader2, Shield, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { InventoryOverview, ProductionOverview } from "@/components/dashboard/charts";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActiveTasksTable, LowStockTable } from "@/components/dashboard/tables";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { Card } from "@/components/ui";
import { getDashboardSummary } from "@/lib/api";
import { downloadExcelSections, printPdfSections } from "@/lib/export-utils";
import { useStoredUser } from "@/lib/permissions";
import type { DashboardSummary } from "@/lib/types";
import type {
  ActiveProductionTask,
  AlertItem,
  InventoryCategory,
  KpiMetric,
  LowStockItem,
  ProductionPoint,
  RecentActivity,
} from "@/types/dashboard";

type DepartmentOverview = {
  department: string;
  primaryMetric: string;
  primaryValue: string;
  secondaryMetric: string;
  secondaryValue: string;
  status: string;
  href: string;
  icon: typeof Boxes;
  color: string;
  bars: number[];
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const lastRefreshAtRef = useRef(0);
  const { isReady, user: currentUser } = useStoredUser();
  const canAccessDashboard = Boolean(currentUser);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await getDashboardSummary({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
      });
      setSummary(response);
      lastRefreshAtRef.current = Date.now();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load live dashboard data.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (isReady && canAccessDashboard) {
      void loadDashboard();
    }
  }, [isReady, canAccessDashboard, loadDashboard]);

  useEffect(() => {
    if (!isReady || !canAccessDashboard) return;

    const refreshDashboard = () => {
      void loadDashboard();
    };
    const refreshOnFocus = () => {
      if (Date.now() - lastRefreshAtRef.current > 30000) {
        refreshDashboard();
      }
    };
    const refreshOnStorage = (event: StorageEvent) => {
      if (event.key === "naptech_data_changed_at") {
        refreshDashboard();
      }
    };

    window.addEventListener("naptech:data-changed", refreshDashboard);
    window.addEventListener("storage", refreshOnStorage);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("naptech:data-changed", refreshDashboard);
      window.removeEventListener("storage", refreshOnStorage);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [isReady, canAccessDashboard, loadDashboard]);

  function getOverviewExportSections() {
    if (!summary) {
      return [];
    }

    return [
      {
        title: "Date Range",
        columns: simpleColumns,
        rows: [
          { metric: "From", value: dateFrom || "All" },
          { metric: "To", value: dateTo || "All" },
        ],
      },
      {
        title: "KPI Cards",
        columns: simpleColumns,
        rows: kpiMetrics.map((metric) => ({ metric: metric.label, value: `${metric.value} (${metric.trend})` })),
      },
      {
        title: "Department Overview",
        columns: departmentExportColumns,
        rows: departmentOverview,
      },
      {
        title: "Inventory Risk Table",
        columns: lowStockExportColumns,
        rows: lowStockItems,
      },
      {
        title: "Production Task Table",
        columns: taskExportColumns,
        rows: activeTasks,
      },
      {
        title: "Alert Table",
        columns: alertExportColumns,
        rows: alerts,
      },
      {
        title: "Recent Activity Table",
        columns: activityExportColumns,
        rows: recentActivities,
      },
      {
        title: "Inventory Chart Data",
        columns: chartExportColumns,
        rows: inventoryCategories.map((item) => ({ label: item.name, planned: "", actual: `${item.value}%` })),
      },
      {
        title: "Production Chart Data",
        columns: chartExportColumns,
        rows: movementSeries.map((item) => ({ label: item.shift, planned: item.planned, actual: item.completed })),
      },
    ];
  }

  function exportExcelReport() {
    downloadExcelSections("naptech-factory-overview.xls", "Naptech Factory OS Overview", getOverviewExportSections());
  }

  function exportPdfReport() {
    printPdfSections("Naptech Factory OS Overview", getOverviewExportSections());
  }

  const kpiMetrics: KpiMetric[] = useMemo(() => (
    summary?.kpi_metrics.map((metric) => ({
      label: metric.label,
      value: metric.value.toLocaleString("en-IN"),
      trend: metric.trend,
      trendDirection: metric.trend_direction,
      icon:
        metric.label === "Total Inventory"
          ? Boxes
          : metric.label === "Total IN Quantity"
            ? Activity
            : metric.label === "Total OUT Quantity"
              ? CheckCircle2
              : AlertTriangle,
      sparkline: metric.sparkline,
    })) ?? []
  ), [summary]);

  const inventoryCategories: InventoryCategory[] = useMemo(() => (
    summary?.inventory_categories.map((item) => ({
      name: item.name,
      value: item.value,
      color: item.color,
    })) ?? []
  ), [summary]);

  const movementSeries: ProductionPoint[] = useMemo(() => summary?.movement_series ?? [], [summary]);
  const alerts: AlertItem[] = useMemo(() => summary?.alerts ?? [], [summary]);
  const lowStockItems: LowStockItem[] = useMemo(() => (
    summary?.low_stock_items.map((item) => ({
      itemName: item.item_name,
      sku: item.sku,
      currentStock: item.current_stock,
      minimumStock: item.minimum_stock,
      status: item.status,
    })) ?? []
  ), [summary]);
  const activeTasks: ActiveProductionTask[] = useMemo(() => (
    summary?.active_tasks_table.map((task) => ({
      taskName: task.task_name,
      line: task.line,
      progress: task.progress,
      assignedWorker: task.assigned_worker,
      status: task.status,
    })) ?? []
  ), [summary]);
  const recentActivities: RecentActivity[] = useMemo(() => summary?.recent_activities ?? [], [summary]);
  const qualityTotals = useMemo(
    () => summary?.quality_overview ?? { rejection: 0, mr: 0, cr: 0 },
    [summary],
  );
  const maintenanceTotals = useMemo(
    () => summary?.maintenance_overview ?? { open: 0, high: 0, completed: 0 },
    [summary],
  );
  const departmentOverview: DepartmentOverview[] = useMemo(() => [
    {
      department: "Inventory",
      primaryMetric: "Total Balance",
      primaryValue: summary ? summary.total_inventory.toLocaleString("en-IN") : "0",
      secondaryMetric: "Low Stock",
      secondaryValue: String(summary?.low_stock_count ?? 0),
      status: summary?.low_stock_count ? "Needs review" : "Healthy",
      href: "/inventory-logs",
      icon: Boxes,
      color: "#19C93B",
      bars: [summary?.total_in_quantity ?? 0, summary?.total_out_quantity ?? 0, summary?.total_rejections ?? 0],
    },
    {
      department: "Production",
      primaryMetric: "Completed",
      primaryValue: String(summary?.completed_tasks ?? 0),
      secondaryMetric: "Delayed",
      secondaryValue: String(summary?.delayed_tasks ?? 0),
      status: summary?.delayed_tasks ? "Watch delays" : "On track",
      href: "/production",
      icon: Factory,
      color: "#38BDF8",
      bars: movementSeries.length ? movementSeries.map((item) => item.completed) : [0, 0, 0],
    },
    {
      department: "Quality",
      primaryMetric: "Rejections",
      primaryValue: qualityTotals.rejection.toLocaleString("en-IN"),
      secondaryMetric: "MR / CR",
      secondaryValue: `${qualityTotals.mr} / ${qualityTotals.cr}`,
      status: qualityTotals.rejection ? "Inspection active" : "No rejection logged",
      href: "/quality",
      icon: Shield,
      color: "#F59E0B",
      bars: [qualityTotals.mr, qualityTotals.cr, qualityTotals.rejection],
    },
    {
      department: "Maintenance",
      primaryMetric: "Open Jobs",
      primaryValue: String(maintenanceTotals.open),
      secondaryMetric: "High Priority",
      secondaryValue: String(maintenanceTotals.high),
      status: maintenanceTotals.open ? "Action pending" : "Stable",
      href: "/maintenance",
      icon: Wrench,
      color: "#A855F7",
      bars: [maintenanceTotals.open, maintenanceTotals.high, maintenanceTotals.completed],
    },
  ], [maintenanceTotals, movementSeries, qualityTotals, summary]);

  if (isReady && !canAccessDashboard) {
    return (
      <DashboardShell>
        <AccessDenied />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      headerActions={
        <>
          <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-2 overflow-hidden sm:grid-cols-2 xl:w-auto xl:grid-cols-[160px_160px_auto_auto_auto_auto]">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <CalendarDays size={13} />
                From Date
              </span>
              <input
                className="form-control h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                onChange={(event) => setDateFrom(event.target.value)}
                type="date"
                value={dateFrom}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                To Date
              </span>
              <input
                className="form-control h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                min={dateFrom || undefined}
                onChange={(event) => setDateTo(event.target.value)}
                type="date"
                value={dateTo}
              />
            </label>
            <button
              className="h-11 w-full self-end rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              disabled={isLoading}
              onClick={() => void loadDashboard()}
              type="button"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="h-11 w-full self-end rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              disabled={!dateFrom && !dateTo}
              onClick={() => {
                setDateFrom("");
                setDateTo("");
              }}
              type="button"
            >
              Clear Range
            </button>
            <button
              className="flex h-11 w-full self-end items-center justify-center gap-2 rounded-xl bg-[#19C93B] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(25,201,59,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!summary}
              onClick={exportExcelReport}
              type="button"
            >
              <Download size={17} />
              Excel Report
            </button>
            <button
              className="flex h-11 w-full self-end items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              disabled={!summary}
              onClick={exportPdfReport}
              type="button"
            >
              <FileText size={17} />
              PDF Report
            </button>
          </div>
        </>
      }
    >

      {error ? (
        <Card className="mb-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </Card>
      ) : null}

      {isLoading && !summary ? (
        <Card className="rounded-2xl p-8">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading live inventory and production data...
          </div>
        </Card>
      ) : summary ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpiMetrics.map((metric, index) => (
              <KpiCard index={index} key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="mt-5">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-[#111827] dark:text-white">Whole Process Overview</h2>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-slate-400">
                A quick department-wise view of where inventory, production, quality, and maintenance stand.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {departmentOverview.map((item, index) => (
                <DepartmentOverviewCard item={item} key={item.department} delay={0.08 + index * 0.04} />
              ))}
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-12">
            <InventoryOverview data={inventoryCategories} totalBalance={summary.total_inventory} />
            <ProductionOverview data={movementSeries} />
          </section>

          <section className="mt-4 grid gap-4 lg:grid-cols-12">
            <LowStockTable items={lowStockItems} />
            <ActiveTasksTable tasks={activeTasks} />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
            <ActivityTimeline items={recentActivities} />
            <AlertsPanel alerts={alerts} />
          </section>
        </>
      ) : null}
    </DashboardShell>
  );
}

function DepartmentOverviewCard({ delay, item }: Readonly<{ delay: number; item: DepartmentOverview }>) {
  const Icon = item.icon;
  const max = Math.max(...item.bars, 1);

  return (
    <DashboardCard className="min-h-[190px] p-4" delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#6B7280] dark:text-slate-400">{item.department}</p>
          <p className="mt-2 text-2xl font-semibold text-[#111827] dark:text-white">{item.primaryValue}</p>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-slate-400">{item.primaryMetric}</p>
        </div>
        <a
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
          href={item.href}
          style={{ color: item.color }}
        >
          <Icon size={19} />
        </a>
      </div>
      <div className="mt-4 flex items-end gap-2">
        {item.bars.slice(0, 6).map((value, index) => (
          <div className="flex h-16 flex-1 items-end rounded-lg bg-slate-100/80 p-1 dark:bg-white/5" key={`${item.department}-${index}`}>
            <div
              className="w-full rounded-md transition-all duration-700"
              style={{
                background: `linear-gradient(180deg, ${item.color}, #19C93B)`,
                height: `${Math.max(12, (Number(value || 0) / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/5">
        <span className="text-xs font-semibold text-[#6B7280] dark:text-slate-400">{item.secondaryMetric}</span>
        <span className="text-sm font-semibold text-[#111827] dark:text-white">{item.secondaryValue}</span>
      </div>
      <p className="mt-3 text-xs font-semibold" style={{ color: item.color }}>
        {item.status}
      </p>
    </DashboardCard>
  );
}

const simpleColumns = [
  { label: "Metric", value: (row: { metric: string; value: string }) => row.metric },
  { label: "Value", value: (row: { metric: string; value: string }) => row.value },
];

const departmentExportColumns = [
  { label: "Department", value: (row: DepartmentOverview) => row.department },
  { label: "Primary Metric", value: (row: DepartmentOverview) => row.primaryMetric },
  { label: "Primary Value", value: (row: DepartmentOverview) => row.primaryValue },
  { label: "Secondary Metric", value: (row: DepartmentOverview) => row.secondaryMetric },
  { label: "Secondary Value", value: (row: DepartmentOverview) => row.secondaryValue },
  { label: "Status", value: (row: DepartmentOverview) => row.status },
];

const lowStockExportColumns = [
  { label: "Item Name", value: (row: LowStockItem) => row.itemName },
  { label: "SKU", value: (row: LowStockItem) => row.sku },
  { label: "Current Stock", value: (row: LowStockItem) => row.currentStock },
  { label: "Minimum Stock", value: (row: LowStockItem) => row.minimumStock },
  { label: "Status", value: (row: LowStockItem) => row.status },
];

const taskExportColumns = [
  { label: "Task Name", value: (row: ActiveProductionTask) => row.taskName },
  { label: "Line", value: (row: ActiveProductionTask) => row.line },
  { label: "Progress", value: (row: ActiveProductionTask) => `${row.progress}%` },
  { label: "Assigned Worker", value: (row: ActiveProductionTask) => row.assignedWorker },
  { label: "Status", value: (row: ActiveProductionTask) => row.status },
];

const alertExportColumns = [
  { label: "Title", value: (row: AlertItem) => row.title },
  { label: "Description", value: (row: AlertItem) => row.description },
  { label: "Type", value: (row: AlertItem) => row.type },
  { label: "Time", value: (row: AlertItem) => row.time },
];

const activityExportColumns = [
  { label: "Title", value: (row: RecentActivity) => row.title },
  { label: "Description", value: (row: RecentActivity) => row.description },
  { label: "Type", value: (row: RecentActivity) => row.type },
  { label: "Time", value: (row: RecentActivity) => row.time },
];

const chartExportColumns = [
  { label: "Label", value: (row: { label: string; planned: string | number; actual: string | number }) => row.label },
  { label: "Planned/Share", value: (row: { label: string; planned: string | number; actual: string | number }) => row.planned },
  { label: "Actual", value: (row: { label: string; planned: string | number; actual: string | number }) => row.actual },
];
