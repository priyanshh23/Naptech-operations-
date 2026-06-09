import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";
import type { ActiveProductionTask, LowStockItem } from "@/types/dashboard";
import Link from "next/link";

const stockStatus = {
  Low: "bg-amber-50 text-amber-700",
  Warning: "bg-[#19C93B]/10 text-[#087B25]",
  Critical: "bg-red-50 text-red-700",
};

const taskStatus = {
  Running: "bg-[#19C93B]/10 text-[#087B25]",
  Delayed: "bg-red-50 text-red-700",
  Queued: "bg-slate-100 text-slate-700",
  Review: "bg-amber-50 text-amber-700",
};

export function LowStockTable({ items }: Readonly<{ items: LowStockItem[] }>) {
  return (
    <DashboardCard className="lg:col-span-6" delay={0.34}>
      <SectionHeader href="/inventory-logs" title="Top Low Stock Items" />
      <div className="mt-4 space-y-3 md:hidden">
        {items.length ? items.map((item) => (
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5" key={item.sku}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[#111827] dark:text-white">{item.itemName}</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280] dark:text-slate-400">SKU: {item.sku}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", stockStatus[item.status])}>
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                <p className="font-semibold uppercase text-[#6B7280] dark:text-slate-400">Current</p>
                <p className="mt-1 text-sm font-semibold text-[#111827] dark:text-white">{item.currentStock}</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 dark:bg-white/5">
                <p className="font-semibold uppercase text-[#6B7280] dark:text-slate-400">Minimum</p>
                <p className="mt-1 text-sm font-semibold text-[#111827] dark:text-white">{item.minimumStock}</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-[#6B7280] dark:bg-white/5 dark:text-slate-400">
            No low stock items.
          </div>
        )}
      </div>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[520px] text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[#6B7280]">
              <th className="pb-3">Item Name</th>
              <th className="pb-3">SKU</th>
              <th className="pb-3">Current</th>
              <th className="pb-3">Minimum</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.sku}>
                <td className="py-4 font-semibold text-[#111827]">{item.itemName}</td>
                <td className="py-4 text-[#6B7280]">{item.sku}</td>
                <td className="py-4 font-semibold text-[#111827]">{item.currentStock}</td>
                <td className="py-4 text-[#6B7280]">{item.minimumStock}</td>
                <td className="py-4">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", stockStatus[item.status])}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

export function ActiveTasksTable({ tasks }: Readonly<{ tasks: ActiveProductionTask[] }>) {
  return (
    <DashboardCard className="lg:col-span-6" delay={0.38}>
      <SectionHeader href="/production" title="Active Production Tasks" />
      <div className="mt-4 space-y-3 md:hidden">
        {tasks.length ? tasks.map((task) => (
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/5" key={task.taskName}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[#111827] dark:text-white">{task.taskName}</p>
                <p className="mt-1 text-xs font-medium text-[#6B7280] dark:text-slate-400">Line: {task.line}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", taskStatus[task.status])}>
                {task.status}
              </span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold text-[#6B7280] dark:text-slate-400">
                <span>Progress</span>
                <span className="text-[#111827] dark:text-white">{task.progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#19C93B] to-[#8BFF4D]"
                  style={{ width: `${task.progress}%` }}
                />
              </div>
            </div>
            <p className="mt-3 break-words text-xs text-[#6B7280] dark:text-slate-400">
              Assigned: <span className="font-semibold text-[#111827] dark:text-white">{task.assignedWorker}</span>
            </p>
          </div>
        )) : (
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-[#6B7280] dark:bg-white/5 dark:text-slate-400">
            No active production tasks.
          </div>
        )}
      </div>
      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="data-table w-full min-w-[600px] text-left text-xs sm:text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-[#6B7280]">
              <th className="pb-3">Task Name</th>
              <th className="pb-3">Line</th>
              <th className="pb-3">Progress</th>
              <th className="pb-3">Assigned Worker</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.taskName}>
                <td className="py-4 font-semibold text-[#111827]">{task.taskName}</td>
                <td className="py-4 text-[#6B7280]">{task.line}</td>
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#19C93B] to-[#8BFF4D]"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-[#111827]">{task.progress}%</span>
                  </div>
                </td>
                <td className="py-4 text-[#6B7280]">{task.assignedWorker}</td>
                <td className="py-4">
                  <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", taskStatus[task.status])}>
                    {task.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}

function SectionHeader({ href, title }: Readonly<{ href: string; title: string }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="min-w-0 break-words text-base font-semibold text-[#111827] dark:text-white sm:text-lg">{title}</h2>
      <Link className="shrink-0 text-sm font-semibold text-[#19C93B]" href={href}>View all</Link>
    </div>
  );
}
