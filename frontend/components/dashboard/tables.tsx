import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { cn } from "@/lib/utils";
import type { ActiveProductionTask, LowStockItem } from "@/types/dashboard";

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
      <SectionHeader title="Low Stock Table" subtitle="Items needing procurement attention" />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
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
      <SectionHeader title="Active Production Tasks" subtitle="Line-wise task execution status" />
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
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

function SectionHeader({ title, subtitle }: Readonly<{ title: string; subtitle: string }>) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-[#111827]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
    </div>
  );
}

