"use client";

import { motion } from "framer-motion";

import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { InventoryOverview, ProductionOverview } from "@/components/dashboard/charts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProductionOutputWidget } from "@/components/dashboard/output-widget";
import { ActiveTasksTable, LowStockTable } from "@/components/dashboard/tables";
import {
  activeTasks,
  alerts,
  inventoryCategories,
  kpiMetrics,
  lowStockItems,
  outputProgress,
  productionSeries,
  recentActivities,
} from "@/data/dashboard";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-7 overflow-hidden rounded-[32px] bg-[#07111A] p-6 text-white shadow-[0_26px_80px_rgba(7,17,26,0.22)] md:p-8"
        initial={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#19C93B]/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-28 w-72 rounded-full bg-[#8BFF4D]/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8BFF4D]">
              NAPTECH Factory OS
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-normal md:text-5xl">
              Modern AI-ready operating layer for automobile manufacturing.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Track production, inventory, workers, alerts, and output performance from one premium industrial SaaS dashboard.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur">
            <HeroStat label="Lines" value="08" />
            <HeroStat label="OEE" value="86%" />
            <HeroStat label="Uptime" value="99.2%" />
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpiMetrics.map((metric, index) => (
          <KpiCard index={index} key={metric.label} metric={metric} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-12">
        <InventoryOverview data={inventoryCategories} />
        <ProductionOverview data={productionSeries} />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <AlertsPanel alerts={alerts} />
        <ProductionOutputWidget {...outputProgress} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-12">
        <LowStockTable items={lowStockItems} />
        <ActiveTasksTable tasks={activeTasks} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-12">
        <ActivityTimeline items={recentActivities} />
      </section>
    </DashboardShell>
  );
}

function HeroStat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="min-w-20 rounded-2xl bg-white/8 px-4 py-3 text-center">
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}
