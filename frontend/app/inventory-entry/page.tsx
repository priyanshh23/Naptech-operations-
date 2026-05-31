"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Loader2, NotebookPen, Pencil, Rows3, Save, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { createInventoryEntry, deleteInventoryEntry, getInventoryEntries, getInventorySummary, updateInventoryEntry } from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type { InventoryEntry, InventoryEntryPayload, InventorySummary } from "@/lib/types";

const initialForm: InventoryEntryPayload = {
  date: new Date().toISOString().slice(0, 10),
  part_name: "",
  schedule_quantity: 0,
  in_quantity: 0,
  out_quantity: 0,
  rejection_quantity: 0,
  remarks: "",
};

const PAGE_SIZE = 10;

export default function InventoryEntryPage() {
  const [form, setForm] = useState<InventoryEntryPayload>(initialForm);
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [recentEntries, setRecentEntries] = useState<InventoryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "inventory");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    void loadPageData();
  }, [dateFrom, dateTo]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return recentEntries;
    }

    return recentEntries.filter((entry) => entry.part_name.toLowerCase().includes(query));
  }, [recentEntries, search]);

  const previousBalance = useMemo(() => {
    if (!summary || !form.part_name.trim()) {
      return 0;
    }

    const match = summary.part_balances.find(
      (item) => item.part_name.toLowerCase() === form.part_name.trim().toLowerCase(),
    );
    return match?.balance_quantity ?? 0;
  }, [form.part_name, summary]);

  const projectedBalance = previousBalance + form.in_quantity - form.out_quantity - form.rejection_quantity;
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const paginatedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo]);

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

  async function loadPageData() {
    setIsLoading(true);
    setError("");

    try {
      const [inventorySummary, inventoryEntries] = await Promise.all([
        getInventorySummary(),
        getInventoryEntries({
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      ]);
      setSummary(inventorySummary);
      setRecentEntries(inventoryEntries.items);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load inventory workflow data.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      if (editingId) {
        const savedEntry = await updateInventoryEntry(editingId, {
          ...form,
          part_name: form.part_name.trim(),
          remarks: form.remarks?.trim() || null,
        });
        setRecentEntries((current) => [savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)].slice(0, 50));
        setEditingId(null);
        setForm({ ...initialForm, date: form.date });
        setSuccessMessage("Inventory entry updated and balance recalculated.");
        await loadPageData();
        return;
      }

      const savedEntry = await createInventoryEntry({
        ...form,
        part_name: form.part_name.trim(),
        remarks: form.remarks?.trim() || null,
      });
      setRecentEntries((current) => [savedEntry, ...current.filter((entry) => entry.id !== savedEntry.id)].slice(0, 50));
      setForm({ ...initialForm, date: form.date });
      setSuccessMessage("Inventory entry saved and running balance updated.");
      try {
        const inventorySummary = await getInventorySummary();
        setSummary(inventorySummary);
      } catch {
        // The row is already saved; keep the operator moving if summary refresh is delayed.
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Entry could not be saved.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entry: InventoryEntry) {
    const confirmed = window.confirm(`Delete inventory entry for ${entry.part_name} on ${formatDate(entry.date)}?`);
    if (!confirmed) return;

    setError("");
    setSuccessMessage("");

    try {
      await deleteInventoryEntry(entry.id);
      setSuccessMessage("Inventory entry deleted and balances recalculated.");
      await loadPageData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Entry could not be deleted.";
      setError(message);
    }
  }

  function startEdit(entry: InventoryEntry) {
    setEditingId(entry.id);
    setForm({
      date: entry.date.slice(0, 10),
      part_name: entry.part_name,
      schedule_quantity: entry.schedule_quantity,
      in_quantity: entry.in_quantity,
      out_quantity: entry.out_quantity,
      rejection_quantity: entry.rejection_quantity,
      remarks: entry.remarks ?? "",
    });
    setError("");
    setSuccessMessage(`Editing ${entry.part_name} from ${formatDate(entry.date)}.`);
  }

  function exportExcel() {
    downloadExcel("inventory-recent-entries.xls", "Inventory Record", inventoryEntryExportColumns, filteredEntries);
  }

  function exportPdf() {
    printPdf("Inventory Record", inventoryEntryExportColumns, filteredEntries);
  }

  return (
    <DashboardShell>
      <PageHeader
        action={
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={exportExcel} type="button">
              <Download size={16} />
              Excel
            </button>
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-semibold text-slate-700" onClick={exportPdf} type="button">
              <FileText size={16} />
              PDF
            </button>
            <Link className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm font-semibold text-slate-700" href="/inventory-logs">
              <Rows3 className="mr-2" size={16} />
              View Logs
            </Link>
          </div>
        }
        description="Enter daily inventory movement the same way the floor team uses the sheet, with balance calculated automatically."
        title="Inventory Entry"
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_380px]">
        <Card className="rounded-2xl border-slate-200 p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Daily Entry</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Inventory movement form</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Fill date, part, schedule, inward, outward, and rejection. The system keeps the running balance for you.
              </p>
            </div>
            <div className="rounded-2xl bg-[#19C93B]/10 p-3 text-[#19C93B]">
              <NotebookPen size={20} />
            </div>
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <Field
              label="Date"
              name="date"
              onChange={(value) => setForm((current) => ({ ...current, date: value }))}
              type="date"
              value={form.date}
            />
            <Field
              label="Part Name"
              name="part_name"
              onChange={(value) => setForm((current) => ({ ...current, part_name: value }))}
              placeholder="e.g. RING CAP"
              value={form.part_name}
            />
            <Field
              label="Schedule Quantity"
              name="schedule_quantity"
              onChange={(value) => setForm((current) => ({ ...current, schedule_quantity: Number(value || 0) }))}
              type="number"
              value={String(form.schedule_quantity)}
            />
            <Field
              label="IN Quantity"
              name="in_quantity"
              onChange={(value) => setForm((current) => ({ ...current, in_quantity: Number(value || 0) }))}
              type="number"
              value={String(form.in_quantity)}
            />
            <Field
              label="OUT Quantity"
              name="out_quantity"
              onChange={(value) => setForm((current) => ({ ...current, out_quantity: Number(value || 0) }))}
              type="number"
              value={String(form.out_quantity)}
            />
            <Field
              label="Rejection Quantity"
              name="rejection_quantity"
              onChange={(value) => setForm((current) => ({ ...current, rejection_quantity: Number(value || 0) }))}
              type="number"
              value={String(form.rejection_quantity)}
            />

            <div className="rounded-2xl border border-dashed border-[#19C93B]/35 bg-[#19C93B]/5 p-4 md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#087B25]">Balance Preview</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-950">{projectedBalance.toLocaleString("en-IN")}</p>
                  <p className="mt-1 text-sm text-slate-500">Previous balance: {previousBalance.toLocaleString("en-IN")}</p>
                </div>
                <div className="grid gap-2 text-sm text-slate-600">
                  <span>IN: +{form.in_quantity.toLocaleString("en-IN")}</span>
                  <span>OUT: -{form.out_quantity.toLocaleString("en-IN")}</span>
                  <span>Rejection: -{form.rejection_quantity.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-border px-4 py-3 outline-none ring-0 transition focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                name="remarks"
                onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
                placeholder="Optional notes for dispatch, shortage, hold, or rejection reason"
                value={form.remarks ?? ""}
              />
            </label>

            {error ? <p className="md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
            {successMessage ? <p className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{successMessage}</p> : null}

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <Button className="h-11 rounded-xl px-5" disabled={isSaving || !form.part_name.trim()} type="submit">
                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
              <button
                className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-slate-700"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...initialForm, date: form.date });
                  setError("");
                  setSuccessMessage("");
                }}
                type="button"
              >
                Clear Form
              </button>
            </div>
          </form>
        </Card>

        <Card className="rounded-2xl border-slate-200 p-5">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#19C93B]">Snapshot</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Current stock position</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="animate-spin" size={16} />
              Loading current balances...
            </div>
          ) : summary ? (
            <div className="space-y-4">
              <Metric label="Total Balance" value={summary.total_inventory.toLocaleString("en-IN")} />
              <Metric label="Total IN" value={summary.total_in_quantity.toLocaleString("en-IN")} />
              <Metric label="Total OUT" value={summary.total_out_quantity.toLocaleString("en-IN")} />
              <Metric label="Rejections" value={summary.total_rejections.toLocaleString("en-IN")} />
              <Metric label="Low Inventory Parts" value={String(summary.low_inventory_count)} />

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Parts with latest balance</p>
                <div className="mt-3 space-y-2">
                  {summary.part_balances.slice(0, 5).map((item) => (
                    <div className="flex items-center justify-between gap-3 text-sm" key={item.part_name}>
                      <span className="truncate text-slate-600">{item.part_name}</span>
                      <Badge tone={item.is_low_inventory ? "warning" : "success"}>
                        {item.balance_quantity.toLocaleString("en-IN")}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      <Card className="mt-6 rounded-2xl border-slate-200">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Recent inventory entries</h2>
            <p className="text-sm text-muted-foreground">Latest sheet-style rows saved by the team.</p>
          </div>
          <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 md:max-w-sm">
            <Search size={18} className="text-muted-foreground" />
            <input
              className="w-full outline-none"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search part name"
              value={search}
            />
          </label>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[repeat(2,220px)_auto_auto] md:items-end">
          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              From Date
            </span>
            <input
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => {
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
              className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              min={dateFrom || undefined}
              onChange={(event) => {
                setDateTo(event.target.value);
              }}
              type="date"
              value={dateTo}
            />
          </label>
          <button
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => void loadPageData()}
            type="button"
          >
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button
            className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!dateFrom && !dateTo}
            onClick={() => {
              setDateFrom("");
              setDateTo("");
            }}
            type="button"
          >
            Clear Dates
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Part Name</th>
                <th className="py-3 pr-4">Schedule</th>
                <th className="py-3 pr-4">IN</th>
                <th className="py-3 pr-4">OUT</th>
                <th className="py-3 pr-4">Rejection</th>
                <th className="py-3 pr-4">Balance</th>
                <th className="py-3 pr-4">Created By</th>
                <th className="py-3 pr-4">Saved At</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedEntries.map((entry) => (
                <tr className="border-b border-border last:border-0" key={entry.id}>
                  <td className="py-4 pr-4 text-slate-700">{formatDate(entry.date)}</td>
                  <td className="py-4 pr-4 font-medium text-slate-950">{entry.part_name}</td>
                  <td className="py-4 pr-4 text-slate-700">{entry.schedule_quantity.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-4 text-slate-700">{entry.in_quantity.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-4 text-slate-700">{entry.out_quantity.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-4 text-slate-700">{entry.rejection_quantity.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-4 font-semibold text-slate-950">{entry.balance_quantity.toLocaleString("en-IN")}</td>
                  <td className="py-4 pr-4 text-slate-700">{entry.created_by}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(entry.created_at)}</td>
                  <td className="py-4 pr-4">
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages} · Showing {paginatedEntries.length} of {filteredEntries.length}
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

      {editingId ? (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <Card className="modal-card max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Edit inventory movement</h2>
                <p className="text-sm text-muted-foreground">Update date, quantities, and remarks for this row.</p>
              </div>
              <button
                className="rounded-xl border border-border p-2 text-slate-600"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...initialForm, date: form.date });
                  setError("");
                  setSuccessMessage("");
                }}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
              <Field label="Date" name="date" onChange={(value) => setForm((current) => ({ ...current, date: value }))} type="date" value={form.date} />
              <Field label="Part Name" name="part_name" onChange={(value) => setForm((current) => ({ ...current, part_name: value }))} placeholder="e.g. RING CAP" value={form.part_name} />
              <Field label="Schedule Quantity" name="schedule_quantity" onChange={(value) => setForm((current) => ({ ...current, schedule_quantity: Number(value || 0) }))} type="number" value={String(form.schedule_quantity)} />
              <Field label="IN Quantity" name="in_quantity" onChange={(value) => setForm((current) => ({ ...current, in_quantity: Number(value || 0) }))} type="number" value={String(form.in_quantity)} />
              <Field label="OUT Quantity" name="out_quantity" onChange={(value) => setForm((current) => ({ ...current, out_quantity: Number(value || 0) }))} type="number" value={String(form.out_quantity)} />
              <Field label="Rejection Quantity" name="rejection_quantity" onChange={(value) => setForm((current) => ({ ...current, rejection_quantity: Number(value || 0) }))} type="number" value={String(form.rejection_quantity)} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-border px-4 py-3 outline-none ring-0 transition focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  name="remarks"
                  onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
                  placeholder="Optional notes for dispatch, shortage, hold, or rejection reason"
                  value={form.remarks ?? ""}
                />
              </label>
              {error ? <p className="md:col-span-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <Button className="h-11 rounded-xl px-5" disabled={isSaving || !form.part_name.trim()} type="submit">
                  {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <button
                  className="h-11 rounded-xl border border-border px-5 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ ...initialForm, date: form.date });
                    setError("");
                    setSuccessMessage("");
                  }}
                  type="button"
                >
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

const inventoryEntryExportColumns = [
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

function Field({
  label,
  name,
  onChange,
  placeholder,
  type = "text",
  value,
}: Readonly<{
  label: string;
  name: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input
        className="h-12 w-full rounded-2xl border border-border px-4 outline-none ring-0 transition focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        name={name}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={name !== "remarks"}
        type={type}
        value={value}
      />
    </label>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
