"use client";

import { Activity, AlertTriangle, ArrowRight, Boxes, CalendarDays, CheckCircle2, Download, Factory, FileText, Loader2, Shield, Wrench } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ActiveTasksTable, LowStockTable } from "@/components/dashboard/tables";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Card } from "@/components/ui";
import { getDashboardSummary } from "@/lib/api";
import { downloadExcelSections, printPdfSections } from "@/lib/export-utils";
import { useStoredUser } from "@/lib/permissions";
import type { DashboardSummary } from "@/lib/types";
import dynamic from "next/dynamic";
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
  actionLabel: string;
  helperText: string;
};

type InsightChartRow = {
  name: string;
  value: number;
  color: string;
};

const InventoryOverview = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.InventoryOverview),
  { loading: () => <ChartSkeleton title="Inventory Overview" /> },
);
const ProductionOverview = dynamic(
  () => import("@/components/dashboard/charts").then((module) => module.ProductionOverview),
  { loading: () => <ChartSkeleton title="Production Overview" /> },
);

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
    // Date filters are applied from the Refresh button, so typing a date never
    // sends partial values like "2" or "12/" to the backend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, canAccessDashboard]);

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

    return () => {
      window.removeEventListener("naptech:data-changed", refreshDashboard);
      window.removeEventListener("storage", refreshOnStorage);
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
        rows: inventoryMovementSeries.map((item) => ({ label: item.shift, planned: item.planned, actual: item.completed })),
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
  const inventoryMovementSeries: ProductionPoint[] = useMemo(() => summary?.inventory_movement_series ?? [], [summary]);
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
      actionLabel: "Check stock",
      helperText: summary?.low_stock_count ? "Some parts are below minimum stock." : "Stock is above the low-stock limit.",
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
      actionLabel: "Open production",
      helperText: summary?.delayed_tasks ? "Some production tasks are delayed." : "No delayed production task is visible.",
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
      actionLabel: "Review quality",
      helperText: qualityTotals.rejection ? "Rejections are logged and need quality tracking." : "No rejection quantity is logged.",
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
      actionLabel: "View jobs",
      helperText: maintenanceTotals.high ? "High-priority maintenance needs attention." : "No high-priority job is open.",
    },
  ], [maintenanceTotals, qualityTotals, summary]);
  const productionCompletedTotal = useMemo(
    () => movementSeries.reduce((sum, item) => sum + Number(item.completed || 0), 0),
    [movementSeries],
  );
  const productionPlannedTotal = useMemo(
    () => movementSeries.reduce((sum, item) => sum + Number(item.planned || 0), 0),
    [movementSeries],
  );
  const factoryFlowData: InsightChartRow[] = useMemo(() => [
    { name: "Material In", value: summary?.total_in_quantity ?? 0, color: "#19C93B" },
    { name: "Material Out", value: summary?.total_out_quantity ?? 0, color: "#38BDF8" },
    { name: "Production Done", value: productionCompletedTotal, color: "#A3FF12" },
    { name: "Quality Reject", value: qualityTotals.rejection, color: "#F59E0B" },
    { name: "Open Maint.", value: maintenanceTotals.open, color: "#A855F7" },
  ], [maintenanceTotals.open, productionCompletedTotal, qualityTotals.rejection, summary]);
  const attentionData: InsightChartRow[] = useMemo(() => [
    { name: "Low Stock", value: summary?.low_stock_count ?? 0, color: "#EF4444" },
    { name: "Production Delays", value: summary?.delayed_tasks ?? 0, color: "#F97316" },
    { name: "Quality Rejections", value: qualityTotals.rejection, color: "#F59E0B" },
    { name: "High Priority Maint.", value: maintenanceTotals.high, color: "#A855F7" },
  ], [maintenanceTotals.high, qualityTotals.rejection, summary]);
  const healthData: InsightChartRow[] = useMemo(() => {
    const productionHealth = productionPlannedTotal > 0 ? Math.min(100, Math.round((productionCompletedTotal / productionPlannedTotal) * 100)) : 100;
    const inventoryHealth = summary?.low_stock_count ? 70 : 100;
    const qualityHealth = qualityTotals.rejection ? Math.max(40, 100 - Math.min(60, qualityTotals.rejection * 5)) : 100;
    const maintenanceHealth = maintenanceTotals.open ? Math.max(45, 100 - Math.min(55, maintenanceTotals.open * 8)) : 100;

    return [
      { name: "Inventory", value: inventoryHealth, color: "#19C93B" },
      { name: "Production", value: productionHealth, color: "#38BDF8" },
      { name: "Quality", value: qualityHealth, color: "#F59E0B" },
      { name: "Maintenance", value: maintenanceHealth, color: "#A855F7" },
    ];
  }, [maintenanceTotals.open, productionCompletedTotal, productionPlannedTotal, qualityTotals.rejection, summary]);

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
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:w-[min(60vw,820px)] xl:grid-cols-[160px_160px_88px_96px_112px_104px]">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                <CalendarDays size={13} />
                From Date
              </span>
              <DatePickerField displayFormat="sheet" inputClassName="h-11 w-full rounded-xl border border-border bg-white px-3 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10" onChange={setDateFrom} placeholder="dd/mm/yyyy" value={dateFrom} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                To Date
              </span>
              <DatePickerField displayFormat="sheet" inputClassName="h-11 w-full rounded-xl border border-border bg-white px-3 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10" min={dateFrom || undefined} onChange={setDateTo} placeholder="dd/mm/yyyy" value={dateTo} />
            </label>
            <button
              className="h-11 w-full self-end rounded-xl border border-border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              disabled={isLoading}
              onClick={() => void loadDashboard()}
              type="button"
            >
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
            <button
              className="h-11 w-full self-end rounded-xl border border-border bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
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
              className="flex h-11 w-full self-end items-center justify-center gap-1.5 rounded-xl bg-[#19C93B] px-2.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(25,201,59,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!summary}
              onClick={exportExcelReport}
              type="button"
            >
              <Download size={17} />
              Excel Report
            </button>
            <button
              className="flex h-11 w-full self-end items-center justify-center gap-1.5 rounded-xl border border-border bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
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

          <section className="mt-4">
            <div className="mb-3">
              <h2 className="text-xl font-semibold text-[#111827] dark:text-white">Factory Visual Insights</h2>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-slate-400">
                Visual checks for flow, health, and attention areas across the full dashboard.
              </p>
            </div>
            <div className="grid gap-4 xl:grid-cols-12">
              <FactoryFlowCard data={factoryFlowData} delay={0.2} title="Today's Factory Flow" />
              <HealthScoreChart data={healthData} delay={0.24} title="Department Health" />
              <AttentionPieChart data={attentionData} delay={0.28} title="Needs Attention" />
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-12">
            <InventoryOverview data={inventoryCategories} movementData={inventoryMovementSeries} totalBalance={summary.total_inventory} />
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

  return (
    <DashboardCard className="min-h-[210px] p-4" delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-[#111827] dark:text-white">{item.department}</p>
          <p className="mt-1 text-sm leading-5 text-[#6B7280] dark:text-slate-400">{item.helperText}</p>
        </div>
        <a
          className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5"
          href={item.href}
          style={{ color: item.color }}
        >
          <Icon size={19} />
        </a>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-slate-400">{item.primaryMetric}</p>
          <p className="mt-2 text-2xl font-semibold text-[#111827] dark:text-white">{item.primaryValue}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-slate-400">{item.secondaryMetric}</p>
          <p className="mt-2 text-2xl font-semibold text-[#111827] dark:text-white">{item.secondaryValue}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-slate-400">Status</p>
          <p className="mt-1 truncate text-sm font-semibold" style={{ color: item.color }}>{item.status}</p>
        </div>
        <a className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold" href={item.href} style={{ color: item.color }}>
          {item.actionLabel}
          <ArrowRight size={14} />
        </a>
      </div>
    </DashboardCard>
  );
}

function FactoryFlowCard({ data, delay, title }: Readonly<{ data: InsightChartRow[]; delay: number; title: string }>) {
  const materialIn = data.find((item) => item.name === "Material In")?.value ?? 0;
  const productionDone = data.find((item) => item.name === "Production Done")?.value ?? 0;
  const materialOut = data.find((item) => item.name === "Material Out")?.value ?? 0;
  const qualityReject = data.find((item) => item.name === "Quality Reject")?.value ?? 0;
  const openMaintenance = data.find((item) => item.name === "Open Maint.")?.value ?? 0;
  const steps = [
    { label: "Material In", value: materialIn, color: "#19C93B" },
    { label: "Production Done", value: productionDone, color: "#38BDF8" },
    { label: "Material Out", value: materialOut, color: "#A3FF12" },
  ];

  return (
    <DashboardCard className="xl:col-span-5" delay={delay}>
      <InsightTitle description="Simple view of what came in, what was produced, and what went out." title={title} />
      <div className="mt-5 grid gap-4 md:grid-cols-3 xl:gap-6">
        {steps.map((step, index) => (
          <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5" key={step.label}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6B7280] dark:text-slate-400">{step.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[#111827] dark:text-white">{step.value.toLocaleString("en-IN")}</p>
            <div className="mt-4 h-2 rounded-full" style={{ background: step.color }} />
            {index < steps.length - 1 ? (
              <span className="absolute -right-4 top-1/2 hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-[#07111A] text-slate-400 dark:border-white/10 md:flex xl:-right-[26px]">
                <ArrowRight size={14} strokeWidth={2} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SimpleAlertMetric color="#F59E0B" label="Quality Reject" value={qualityReject} />
        <SimpleAlertMetric color="#A855F7" label="Open Maintenance" value={openMaintenance} />
      </div>
    </DashboardCard>
  );
}

function SimpleAlertMetric({ color, label, value }: Readonly<{ color: string; label: string; value: number }>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="flex items-center gap-2 text-sm font-semibold text-[#6B7280] dark:text-slate-400">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-lg font-semibold text-[#111827] dark:text-white">{value.toLocaleString("en-IN")}</span>
    </div>
  );
}

function HealthScoreChart({ data, delay, title }: Readonly<{ data: InsightChartRow[]; delay: number; title: string }>) {
  return (
    <DashboardCard className="xl:col-span-4" delay={delay}>
      <InsightTitle description="Simple 0-100 scores from stock, production, quality, and maintenance signals." title={title} />
      <div className="mt-5 space-y-4">
        {data.map((item) => (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-[#111827] dark:text-white">{item.name}</span>
              <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
              <div className="h-full rounded-full transition-all duration-700" style={{ background: item.color, width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
}

function AttentionPieChart({ data, delay, title }: Readonly<{ data: InsightChartRow[]; delay: number; title: string }>) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <DashboardCard className="xl:col-span-3" delay={delay}>
      <InsightTitle description="Shows where supervisors should look first." title={title} />
      <div className="mt-5 space-y-3">
        {data.map((item) => (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5" key={item.name}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold text-[#111827] dark:text-white">{item.name}</span>
              <span className="text-sm font-semibold" style={{ color: item.color }}>{item.value.toLocaleString("en-IN")}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white dark:bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ background: item.color, width: `${Math.max(8, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {data.every((item) => item.value === 0) ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          No urgent issue visible.
        </p>
      ) : null}
    </DashboardCard>
  );
}

function InsightTitle({ description, title }: Readonly<{ description: string; title: string }>) {
  return (
    <div>
      <h3 className="text-base font-semibold text-[#111827] dark:text-white">{title}</h3>
      <p className="mt-1 text-sm leading-5 text-[#6B7280] dark:text-slate-400">{description}</p>
    </div>
  );
}

function ChartSkeleton({ title }: Readonly<{ title: string }>) {
  return (
    <DashboardCard className="min-h-[320px] xl:col-span-6">
      <h3 className="text-base font-semibold text-[#111827] dark:text-white">{title}</h3>
      <div className="mt-5 h-56 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
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
