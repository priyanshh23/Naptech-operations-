"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Filter, Loader2, Pencil, Save, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { deleteInventoryEntry, getInventoryLogs, getInventorySummary, updateInventoryEntry } from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type { InventoryEntry, InventoryEntryPayload, InventorySummary } from "@/lib/types";

const PAGE_SIZE = 10;

export default function InventoryLogsPage() {
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [search, setSearch] = useState("");
  const [partNameFilter, setPartNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editingEntry, setEditingEntry] = useState<InventoryEntry | null>(null);
  const [editForm, setEditForm] = useState<InventoryEntryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const deletedEntryIdsRef = useRef<Set<number>>(new Set());
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "inventory");

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search")?.trim();
    if (initialSearch) {
      setSearch(initialSearch);
    }
    void loadSummary();
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [page, search, partNameFilter, dateFrom, dateTo]);

  async function loadSummary() {
    try {
      const data = await getInventorySummary();
      setSummary(data);
    } catch {
      setError("Unable to load inventory summary.");
    }
  }

  if (!isUserReady) {
    return (
      <DashboardShell>
        <Card className="rounded-2xl p-8 text-sm text-slate-500">Loading inventory access...</Card>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell>
        <AccessDenied department="Inventory" />
      </DashboardShell>
    );
  }

  async function loadLogs() {
    setIsLoading(true);
    setError("");

    try {
      const response = await getInventoryLogs({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        part_name: partNameFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      setEntries(withoutDeletedIds(response.items, deletedEntryIdsRef.current));
      setTotal(response.total);
    } catch {
      setError("Unable to load inventory logs. Please login again and retry.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(entry: InventoryEntry) {
    if (deletedEntryIdsRef.current.has(entry.id)) return;

    const confirmed = window.confirm(`Delete inventory entry for ${entry.part_name} on ${formatDate(entry.date)}?`);
    if (!confirmed) return;

    setError("");
    const previousEntries = entries;
    const previousTotal = total;
    deletedEntryIdsRef.current.add(entry.id);
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setTotal((current) => Math.max(0, current - 1));

    try {
      await deleteInventoryEntry(entry.id);
      void Promise.all([loadSummary(), loadLogs()]);
    } catch (error) {
      deletedEntryIdsRef.current.delete(entry.id);
      setEntries(previousEntries);
      setTotal(previousTotal);
      const message = error instanceof Error ? error.message : "Inventory entry could not be deleted.";
      setError(message);
    }
  }

  function startEdit(entry: InventoryEntry) {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date.slice(0, 10),
      part_name: entry.part_name,
      schedule_quantity: entry.schedule_quantity,
      in_quantity: entry.in_quantity,
      out_quantity: entry.out_quantity,
      rejection_quantity: entry.rejection_quantity,
      remarks: entry.remarks ?? "",
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry || !editForm) return;

    setIsSaving(true);
    setError("");

    try {
      await updateInventoryEntry(editingEntry.id, {
        ...editForm,
        part_name: editForm.part_name.trim(),
        remarks: editForm.remarks?.trim() || null,
      });
      setEditingEntry(null);
      setEditForm(null);
      await Promise.all([loadSummary(), loadLogs()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Inventory entry could not be updated.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function getExportRows() {
    const rows: InventoryEntry[] = [];
    let exportPage = 1;
    let exportTotal = 0;

    do {
      const response = await getInventoryLogs({
        page: exportPage,
        page_size: 100,
        search: search || undefined,
        part_name: partNameFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      });
      rows.push(...response.items);
      exportTotal = response.total;
      exportPage += 1;
    } while (rows.length < exportTotal);

    return rows;
  }

  async function exportExcel() {
    const rows = await getExportRows();
    downloadExcel("inventory-logs.xls", "Inventory Record", inventoryExportColumns, rows);
  }

  async function exportPdf() {
    const rows = await getExportRows();
    printPdf("Inventory Record", inventoryExportColumns, rows);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={() => void exportExcel()} type="button">
              <Download size={16} />
              Excel
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={() => void exportPdf()} type="button">
              <FileText size={16} />
              PDF
            </button>
            <Link className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-slate-700" href="/inventory-entry">
              New Entry
            </Link>
          </div>
        }
        description="Review saved inventory rows, search by part name, and filter by date without leaving the floor workflow."
        title="Inventory Logs"
      />

      <Card className="rounded-2xl border-slate-200">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_220px_repeat(2,180px)_auto_auto] lg:items-end">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-3">
            <Search size={18} className="text-muted-foreground" />
            <input
              className="w-full outline-none"
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Search part, remark, or user"
              value={search}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Part
            </span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none"
              onChange={(event) => {
                setPage(1);
                setPartNameFilter(event.target.value);
              }}
              value={partNameFilter}
            >
              <option value="">All parts</option>
              {summary?.part_balances.map((item) => (
                <option key={item.part_name} value={item.part_name}>
                  {item.part_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              From Date
            </span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none"
              onChange={(event) => {
                setPage(1);
                setDateFrom(event.target.value);
              }}
              type="date"
              value={dateFrom}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              To Date
            </span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none"
              min={dateFrom || undefined}
              onChange={(event) => {
                setPage(1);
                setDateTo(event.target.value);
              }}
              type="date"
              value={dateTo}
            />
          </label>
          <button
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => void loadLogs()}
            type="button"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!search && !partNameFilter && !dateFrom && !dateTo}
            onClick={() => {
              setPage(1);
              setSearch("");
              setPartNameFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            type="button"
          >
            Clear
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Filter size={14} />
          Showing {entries.length} of {total} saved entries
        </div>

        {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}

        <div className="mt-5 overflow-x-auto">
          <table className="data-table w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Part Name</th>
                <th className="py-3 pr-4">Schedule</th>
                <th className="py-3 pr-4">IN</th>
                <th className="py-3 pr-4">OUT</th>
                <th className="py-3 pr-4">Rejection</th>
                <th className="py-3 pr-4">Balance</th>
                <th className="py-3 pr-4">Remarks</th>
                <th className="py-3 pr-4">Created By</th>
                <th className="py-3 pr-4">Saved At</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={11}>
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading entries...
                    </span>
                  </td>
                </tr>
              ) : entries.length ? (
                entries.map((entry) => (
                  <tr className="border-b border-border last:border-0" key={entry.id}>
                    <td className="py-4 pr-4 text-slate-700">{formatDate(entry.date)}</td>
                    <td className="wrap-cell py-4 pr-4 font-medium text-slate-950">{entry.part_name}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.schedule_quantity.toLocaleString("en-IN")}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.in_quantity.toLocaleString("en-IN")}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.out_quantity.toLocaleString("en-IN")}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.rejection_quantity.toLocaleString("en-IN")}</td>
                    <td className="table-actions py-4 pr-4">
                      <Badge tone={entry.balance_quantity < (summary?.low_inventory_threshold ?? 1000) ? "warning" : "success"}>
                        {entry.balance_quantity.toLocaleString("en-IN")}
                      </Badge>
                    </td>
                    <td className="wrap-cell py-4 pr-4 text-slate-700">{entry.remarks || "-"}</td>
                    <td className="py-4 pr-4 text-slate-700">{entry.created_by}</td>
                    <td className="py-4 pr-4 text-slate-700">{formatDateTime(entry.created_at)}</td>
                    <td className="table-actions py-4 pr-4">
                      <button
                        className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => startEdit(entry)}
                        type="button"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    {canDelete ? (
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => void handleDelete(entry)}
                        type="button"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="py-10 text-center text-slate-500" colSpan={11}>
                    No inventory entries found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <ChevronLeft className="mr-1" size={16} />
              Previous
            </button>
            <button
              className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              type="button"
            >
              Next
              <ChevronRight className="ml-1" size={16} />
            </button>
          </div>
        </div>
      </Card>

      {editingEntry && editForm ? (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <Card className="modal-card max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Edit inventory entry</h2>
                <p className="text-sm text-muted-foreground">Updating quantities recalculates the running balance for this part.</p>
              </div>
              <button className="rounded-xl border border-border p-2 text-slate-600" onClick={() => setEditingEntry(null)} type="button">
                <X size={16} />
              </button>
            </div>
            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleEditSubmit}>
              <EditField label="Date" onChange={(value) => setEditForm((current) => current && ({ ...current, date: value }))} type="date" value={editForm.date} />
              <EditField label="Part Name" onChange={(value) => setEditForm((current) => current && ({ ...current, part_name: value }))} value={editForm.part_name} />
              <EditField label="Schedule Quantity" onChange={(value) => setEditForm((current) => current && ({ ...current, schedule_quantity: Number(value || 0) }))} type="number" value={String(editForm.schedule_quantity)} />
              <EditField label="IN Quantity" onChange={(value) => setEditForm((current) => current && ({ ...current, in_quantity: Number(value || 0) }))} type="number" value={String(editForm.in_quantity)} />
              <EditField label="OUT Quantity" onChange={(value) => setEditForm((current) => current && ({ ...current, out_quantity: Number(value || 0) }))} type="number" value={String(editForm.out_quantity)} />
              <EditField label="Rejection Quantity" onChange={(value) => setEditForm((current) => current && ({ ...current, rejection_quantity: Number(value || 0) }))} type="number" value={String(editForm.rejection_quantity)} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setEditForm((current) => current && ({ ...current, remarks: event.target.value }))}
                  value={editForm.remarks ?? ""}
                />
              </label>
              <div className="flex gap-3 md:col-span-2">
                <Button disabled={isSaving} type="submit">
                  <Save size={16} />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <button className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={() => setEditingEntry(null)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </DashboardShell>
  );
}

function withoutDeletedIds<T extends { id: number }>(items: T[], deletedIds: Set<number>): T[] {
  return items.filter((item) => !deletedIds.has(item.id));
}

const inventoryExportColumns = [
  { label: "Date", value: (row: InventoryEntry) => formatDate(row.date) },
  { label: "Part Name", value: (row: InventoryEntry) => row.part_name },
  { label: "Schedule Quantity", value: (row: InventoryEntry) => row.schedule_quantity },
  { label: "IN Quantity", value: (row: InventoryEntry) => row.in_quantity },
  { label: "OUT Quantity", value: (row: InventoryEntry) => row.out_quantity },
  { label: "Rejection Quantity", value: (row: InventoryEntry) => row.rejection_quantity },
  { label: "Balance Quantity", value: (row: InventoryEntry) => row.balance_quantity },
  { label: "Remarks", value: (row: InventoryEntry) => row.remarks || "-" },
  { label: "Created By", value: (row: InventoryEntry) => row.created_by },
  { label: "Saved At", value: (row: InventoryEntry) => formatDateTime(row.created_at) },
];

function EditField({
  label,
  onChange,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input
        className="h-11 w-full rounded-xl border border-border px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
