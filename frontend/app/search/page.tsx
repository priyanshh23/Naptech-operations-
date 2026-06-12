"use client";

import { AlertTriangle, Boxes, Factory, Loader2, Search, Shield, Wrench } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getDashboardSummary, getInventoryLogs, getMaintenanceJobs, getNotifications, getProductionEntries, getQualityRejections } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import type { InventoryEntry, MaintenanceJob, Notification, ProductionEntry, QualityRejection } from "@/lib/types";

type OverviewResult = {
  title: string;
  description: string;
  href: string;
  badge: string;
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [inventory, setInventory] = useState<InventoryEntry[]>([]);
  const [production, setProduction] = useState<ProductionEntry[]>([]);
  const [quality, setQuality] = useState<QualityRejection[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceJob[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [overview, setOverview] = useState<OverviewResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const term = params.get("query")?.trim() ?? "";
    setQuery(term);
    void runSearch(term);
  }, []);

  async function runSearch(term: string) {
    setIsLoading(true);
    setError("");

    try {
      const normalized = term.toLowerCase();
      const [inventoryResponse, productionResponse, qualityResponse, maintenanceResponse, notificationResponse, dashboardResponse] = await Promise.all([
        getInventoryLogs({ page: 1, page_size: 8, search: term || undefined }),
        getProductionEntries({ search: term || undefined }),
        getQualityRejections({ search: term || undefined }),
        getMaintenanceJobs({ search: term || undefined }),
        getNotifications(),
        getDashboardSummary(),
      ]);

      setInventory(inventoryResponse.items.slice(0, 8));
      setProduction(productionResponse.items.slice(0, 8));
      setNotifications(
        notificationResponse
          .filter((item) => [item.message, item.type, item.created_at].some((value) => value.toLowerCase().includes(normalized)))
          .slice(0, 8),
      );
      setQuality(qualityResponse.items.slice(0, 8));
      setMaintenance(maintenanceResponse.items.slice(0, 8));
      setOverview(buildOverviewResults(normalized, dashboardResponse));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Search failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const totalResults = useMemo(
    () => inventory.length + production.length + quality.length + maintenance.length + notifications.length + overview.length,
    [inventory.length, production.length, quality.length, maintenance.length, notifications.length, overview.length],
  );

  return (
    <DashboardShell>
      <PageHeader
        description="Search across inventory, production, quality, maintenance, alerts, and overview metrics."
        title="Global Search"
      />

      <Card className="mb-5 rounded-2xl">
        <form
          className="flex flex-col gap-3 md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const term = String(formData.get("query") ?? "").trim();
            window.history.replaceState(null, "", `/search?query=${encodeURIComponent(term)}`);
            setQuery(term);
            void runSearch(term);
          }}
        >
          <label className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              className="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-sm font-medium outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10 dark:border-white/10 dark:bg-white/5 dark:text-white"
              defaultValue={query}
              name="query"
              placeholder="Try CNC-08, Torque Arm, rejection, low stock..."
            />
          </label>
          <button className="h-12 rounded-xl bg-[#19C93B] px-6 text-sm font-semibold text-white" type="submit">
            Search
          </button>
        </form>
      </Card>

      {error ? <Card className="mb-5 rounded-2xl border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</Card> : null}

      {isLoading ? (
        <Card className="rounded-2xl p-8">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Searching factory data...
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-300">
            {totalResults} result{totalResults === 1 ? "" : "s"} for <span className="font-semibold text-slate-950 dark:text-white">{query || "all data"}</span>
          </p>
          <OverviewSection items={overview} />
          <InventorySection items={inventory} query={query} />
          <ProductionSection items={production} query={query} />
          <QualitySection items={quality} query={query} />
          <MaintenanceSection items={maintenance} query={query} />
          <NotificationSection items={notifications} />
        </div>
      )}
    </DashboardShell>
  );
}

function OverviewSection({ items }: Readonly<{ items: OverviewResult[] }>) {
  return (
    <ResultSection href="/dashboard" icon={<Boxes size={18} />} items={items} title="Overview Matches" />
  );
}

function InventorySection({ items, query }: Readonly<{ items: InventoryEntry[]; query: string }>) {
  return (
    <SearchBlock href={`/inventory-logs?search=${encodeURIComponent(query)}`} icon={<Boxes size={18} />} title="Inventory">
      {items.map((item) => (
        <ResultRow
          badge={`Balance ${item.balance_quantity}`}
          description={`${formatDate(item.date)} | IN ${item.in_quantity} | OUT ${item.out_quantity} | Rej ${item.rejection_quantity}`}
          href={`/inventory-logs?search=${encodeURIComponent(item.part_name)}`}
          key={item.id}
          title={item.part_name}
        />
      ))}
    </SearchBlock>
  );
}

function ProductionSection({ items, query }: Readonly<{ items: ProductionEntry[]; query: string }>) {
  return (
    <SearchBlock href={`/production?search=${encodeURIComponent(query)}`} icon={<Factory size={18} />} title="Production">
      {items.map((item) => (
        <ResultRow
          badge={`${Math.round((item.actual_production / Math.max(item.daily_target, 1)) * 100)}%`}
          description={`${formatDate(item.date)} | ${item.machine_number} | ${item.operator_name} | Target ${item.daily_target}, Actual ${item.actual_production}`}
          href={`/production?search=${encodeURIComponent(item.machine_number)}`}
          key={item.id}
          title={`${item.part_name} (${item.part_number})`}
        />
      ))}
    </SearchBlock>
  );
}

function QualitySection({ items, query }: Readonly<{ items: QualityRejection[]; query: string }>) {
  return (
    <SearchBlock href={`/quality?search=${encodeURIComponent(query)}`} icon={<Shield size={18} />} title="Quality">
      {items.map((item) => (
        <ResultRow
          badge={item.crMr}
          description={`${formatDate(item.date)} | ${item.machineNumber} | ${item.reason}`}
          href={`/quality?search=${encodeURIComponent(item.machineNumber || item.partName)}`}
          key={item.id}
          title={item.partName}
        />
      ))}
    </SearchBlock>
  );
}

function MaintenanceSection({ items, query }: Readonly<{ items: MaintenanceJob[]; query: string }>) {
  return (
    <SearchBlock href={`/maintenance?search=${encodeURIComponent(query)}`} icon={<Wrench size={18} />} title="Maintenance">
      {items.map((item) => (
        <ResultRow
          badge={item.status}
          description={`${item.machine} | ${item.team} | ${item.priority} priority`}
          href={`/maintenance?search=${encodeURIComponent(item.machine)}`}
          key={item.id}
          title={item.reason}
        />
      ))}
    </SearchBlock>
  );
}

function NotificationSection({ items }: Readonly<{ items: Notification[] }>) {
  return (
    <SearchBlock href="/notifications" icon={<AlertTriangle size={18} />} title="Alerts">
      {items.map((item) => (
        <ResultRow
          badge={item.is_read ? "Read" : "New"}
          description={`${item.type.replaceAll("_", " ")} | ${formatDateTime(item.created_at)}`}
          href="/notifications"
          key={item.id}
          title={item.message}
        />
      ))}
    </SearchBlock>
  );
}

function ResultSection({ href, icon, items, title }: Readonly<{ href: string; icon: ReactNode; items: OverviewResult[]; title: string }>) {
  return (
    <SearchBlock href={href} icon={icon} title={title}>
      {items.map((item) => (
        <ResultRow badge={item.badge} description={item.description} href={item.href} key={item.title} title={item.title} />
      ))}
    </SearchBlock>
  );
}

function SearchBlock({ children, href, icon, title }: Readonly<{ children: ReactNode; href: string; icon: ReactNode; title: string }>) {
  const hasRows = Boolean(children && (!Array.isArray(children) || children.length));

  return (
    <Card className="rounded-2xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#19C93B]/10 text-[#087B25]">{icon}</span>
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        </div>
        <Link className="text-sm font-semibold text-[#19C93B]" href={href}>
          Open
        </Link>
      </div>
      {hasRows ? <div className="divide-y divide-border">{children}</div> : <p className="text-sm text-slate-500">No matching rows.</p>}
    </Card>
  );
}

function ResultRow({ badge, description, href, title }: Readonly<{ badge: string; description: string; href: string; title: string }>) {
  return (
    <Link className="flex flex-col gap-2 py-3 transition hover:bg-slate-50 dark:hover:bg-white/5 md:flex-row md:items-center md:justify-between" href={href}>
      <div>
        <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{description}</p>
      </div>
      <Badge tone="info">{badge}</Badge>
    </Link>
  );
}

function buildOverviewResults(query: string, summary: Awaited<ReturnType<typeof getDashboardSummary>>): OverviewResult[] {
  const rows: OverviewResult[] = [
    { title: "Total Inventory", description: `${summary.total_inventory.toLocaleString("en-IN")} balance quantity`, href: "/dashboard", badge: "Inventory" },
    { title: "Total IN Quantity", description: `${summary.total_in_quantity.toLocaleString("en-IN")} inward quantity`, href: "/dashboard", badge: "Inventory" },
    { title: "Total OUT Quantity", description: `${summary.total_out_quantity.toLocaleString("en-IN")} outward quantity`, href: "/dashboard", badge: "Inventory" },
    { title: "Total Rejections", description: `${summary.total_rejections.toLocaleString("en-IN")} rejected inventory quantity`, href: "/dashboard", badge: "Quality" },
    { title: "Low Stock Items", description: `${summary.low_stock_count} item${summary.low_stock_count === 1 ? "" : "s"} below threshold`, href: "/inventory-logs", badge: "Inventory" },
    { title: "Active Production Tasks", description: `${summary.active_tasks} active production task${summary.active_tasks === 1 ? "" : "s"}`, href: "/production", badge: "Production" },
    { title: "Delayed Tasks", description: `${summary.delayed_tasks} delayed production task${summary.delayed_tasks === 1 ? "" : "s"}`, href: "/production", badge: "Production" },
  ];
  if (!query) return rows;
  return rows.filter((row) => [row.title, row.description, row.badge].some((value) => value.toLowerCase().includes(query)));
}
