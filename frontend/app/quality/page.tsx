"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { createQualityRejection, deleteQualityRejection, getQualityRejections, updateQualityRejection } from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type { QualityRejection, QualityRejectionPayload } from "@/lib/types";

const PAGE_SIZE = 10;

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  shift: "A" as QualityRejection["shift"],
  serialNumber: "",
  machineNumber: "",
  partName: "",
  rejectionQuantity: 0,
  reason: "",
  cause: "",
  crMr: "MR" as QualityRejection["crMr"],
  remarks: "",
};

export default function QualityPage() {
  const [qualityRows, setQualityRows] = useState<QualityRejection[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deletedRowIdsRef = useRef<Set<number>>(new Set());
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "quality");

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return qualityRows;
    return qualityRows.filter((row) =>
      [
        row.date,
        row.shift,
        row.serialNumber,
        row.machineNumber,
        row.partName,
        row.reason,
        row.cause,
        row.crMr,
        row.remarks,
      ].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [qualityRows, search]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totals = useMemo(
    () => ({
      rejection: qualityRows.reduce((sum, row) => sum + row.rejectionQuantity, 0),
      mr: qualityRows.filter((row) => row.crMr === "MR").reduce((sum, row) => sum + row.rejectionQuantity, 0),
      cr: qualityRows.filter((row) => row.crMr === "CR").reduce((sum, row) => sum + row.rejectionQuantity, 0),
    }),
    [qualityRows],
  );

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search")?.trim();
    if (initialSearch) {
      setSearch(initialSearch);
    }
    void loadQualityRows();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!isUserReady) {
    return (
      <DashboardShell>
        <Card className="rounded-2xl p-8 text-sm text-slate-500">Loading quality access...</Card>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell>
        <AccessDenied department="Quality" />
      </DashboardShell>
    );
  }

  async function loadQualityRows() {
    setError("");
    try {
      const response = await getQualityRejections();
      setQualityRows(withoutDeletedIds(response.items, deletedRowIdsRef.current));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load quality rows.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (editingId) {
      try {
        await updateQualityRejection(editingId, normalizeForm());
        await loadQualityRows();
        setEditingId(null);
        setForm(initialForm);
        setMessage("Daily rejection row updated.");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Daily rejection row could not be updated.");
      }
      return;
    }

    try {
      await createQualityRejection(normalizeForm());
      await loadQualityRows();
      setPage(1);
      setForm({ ...initialForm, date: form.date, shift: form.shift });
      setMessage("Daily rejection row saved.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Daily rejection row could not be saved.");
    }
  }

  function normalizeForm(): QualityRejectionPayload {
    return {
      date: form.date,
      shift: form.shift,
      serialNumber: form.serialNumber.trim(),
      machineNumber: form.machineNumber.trim(),
      partName: form.partName.trim(),
      rejectionQuantity: Number(form.rejectionQuantity || 0),
      reason: form.reason.trim(),
      cause: form.cause.trim(),
      crMr: form.crMr,
      remarks: form.remarks.trim(),
    };
  }

  function startEdit(row: QualityRejection) {
    setEditingId(row.id);
    setForm({
      date: row.date.slice(0, 10),
      shift: row.shift,
      serialNumber: row.serialNumber,
      machineNumber: row.machineNumber,
      partName: row.partName,
      rejectionQuantity: row.rejectionQuantity,
      reason: row.reason,
      cause: row.cause,
      crMr: row.crMr,
      remarks: row.remarks,
    });
    setMessage(`Editing ${row.id}.`);
  }

  async function handleDelete(row: QualityRejection) {
    const confirmed = window.confirm(`Delete rejection row ${row.serialNumber || row.id}?`);
    if (!confirmed) return;

    setError("");
    const previousRows = qualityRows;
    deletedRowIdsRef.current.add(row.id);
    setQualityRows((current) => {
      const nextRows = current.filter((item) => item.id !== row.id);
      setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil(nextRows.length / PAGE_SIZE))));
      return nextRows;
    });

    try {
      await deleteQualityRejection(row.id);
      void loadQualityRows();
      setMessage("Daily rejection row deleted.");
    } catch (error) {
      deletedRowIdsRef.current.delete(row.id);
      setQualityRows(previousRows);
      setError(error instanceof Error ? error.message : "Daily rejection row could not be deleted.");
    }
  }

  function exportExcel() {
    downloadExcel("daily-rejection-report.xls", "Daily Rejection Report", qualityExportColumns, filteredRows);
  }

  function exportPdf() {
    printPdf("Daily Rejection Report", qualityExportColumns, filteredRows);
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
          </div>
        }
        description="Fill the daily rejection report in the same format used on the shop floor."
        title="Quality"
      />

      <Card className="mb-5 rounded-2xl border-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-[#19C93B]/10 p-2 text-[#19C93B]">
            <Plus size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Daily rejection report entry</h2>
            <p className="text-sm text-muted-foreground">Enter S.No, machine, part, rejection quantity, reason, cause, CR/MR, and remarks.</p>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={handleSubmit}>
          <Field label="Date" onChange={(value) => setForm((current) => ({ ...current, date: value }))} placeholder="" type="date" value={form.date} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Shift</span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value as QualityRejection["shift"] }))}
              value={form.shift}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <Field label="S. No." onChange={(value) => setForm((current) => ({ ...current, serialNumber: value }))} placeholder="1" value={form.serialNumber} />
          <Field label="Machine Number" onChange={(value) => setForm((current) => ({ ...current, machineNumber: value }))} placeholder="CNC-08" value={form.machineNumber} />
          <Field label="Part Name" onChange={(value) => setForm((current) => ({ ...current, partName: value }))} placeholder="Ring Cap" value={form.partName} />
          <Field label="Rejection Qty." onChange={(value) => setForm((current) => ({ ...current, rejectionQuantity: Number(value || 0) }))} placeholder="1" type="number" value={String(form.rejectionQuantity)} />
          <Field label="Reason" onChange={(value) => setForm((current) => ({ ...current, reason: value }))} placeholder="Thread not OK" value={form.reason} />
          <Field label="Cause" onChange={(value) => setForm((current) => ({ ...current, cause: value }))} placeholder="Variation" value={form.cause} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">CR / MR</span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setForm((current) => ({ ...current, crMr: event.target.value as QualityRejection["crMr"] }))}
              value={form.crMr}
            >
              <option value="MR">MR</option>
              <option value="CR">CR</option>
            </select>
          </label>
          <Field label="Remarks" onChange={(value) => setForm((current) => ({ ...current, remarks: value }))} placeholder="Optional" value={form.remarks} />
          <Button className="h-11 self-end rounded-xl" disabled={!form.serialNumber || !form.machineNumber || !form.partName || !form.reason || !form.cause} type="submit">
            <Save size={16} />
            Save Row
          </Button>
        </form>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Summary label="Total Rejection" value={totals.rejection} />
          <Summary label="Total M/R" value={totals.mr} />
          <Summary label="Total C/R" value={totals.cr} />
        </div>

        {message ? <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">Daily Rejection Report</h2>
          <p className="text-sm text-muted-foreground">Naptech Precision Engineering rejection rows saved by shift.</p>
        </div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search machine, part, reason, cause"
              value={search}
            />
            {search ? (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setSearch("")}
                type="button"
              >
                <X size={16} />
              </button>
            ) : null}
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Shift</th>
                <th className="py-3 pr-4">S. No.</th>
                <th className="py-3 pr-4">Machine Number</th>
                <th className="py-3 pr-4">Part Name</th>
                <th className="py-3 pr-4">Rejection Qty.</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3 pr-4">Cause</th>
                <th className="py-3 pr-4">CR / MR</th>
                <th className="py-3 pr-4">Remarks</th>
                <th className="py-3 pr-4">Updated</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row) => (
                <tr className="border-b border-border last:border-0" key={row.id}>
                  <td className="py-4 pr-4 text-slate-700">{formatDate(row.date)}</td>
                  <td className="py-4 pr-4 text-slate-700">{row.shift}</td>
                  <td className="py-4 pr-4 font-semibold text-slate-950">{row.serialNumber}</td>
                  <td className="py-4 pr-4 text-slate-700">{row.machineNumber}</td>
                  <td className="py-4 pr-4 text-slate-700">{row.partName}</td>
                  <td className="py-4 pr-4 font-semibold text-slate-950">{row.rejectionQuantity}</td>
                  <td className="py-4 pr-4 text-slate-700">{row.reason}</td>
                  <td className="py-4 pr-4 text-slate-700">{row.cause}</td>
                  <td className="py-4 pr-4">
                    <Badge tone={row.crMr === "MR" ? "warning" : "danger"}>{row.crMr}</Badge>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{row.remarks || "-"}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(row.timestamp)}</td>
                  <td className="py-4 pr-4">
                    <button
                      className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => startEdit(row)}
                      type="button"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    {canDelete ? (
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => void handleDelete(row)}
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
        <Pagination count={paginatedRows.length} page={page} setPage={setPage} total={filteredRows.length} totalPages={totalPages} />
      </Card>
      {editingId ? (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <Card className="modal-card max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Edit daily rejection row</h2>
                <p className="text-sm text-muted-foreground">Update machine, part, rejection details, and root-cause data.</p>
              </div>
              <button
                className="rounded-xl border border-border p-2 text-slate-600"
                onClick={() => {
                  setEditingId(null);
                  setForm(initialForm);
                  setMessage("");
                }}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
              <Field label="Date" onChange={(value) => setForm((current) => ({ ...current, date: value }))} placeholder="" type="date" value={form.date} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Shift</span>
                <select
                  className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setForm((current) => ({ ...current, shift: event.target.value as QualityRejection["shift"] }))}
                  value={form.shift}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </label>
              <Field label="S. No." onChange={(value) => setForm((current) => ({ ...current, serialNumber: value }))} placeholder="1" value={form.serialNumber} />
              <Field label="Machine Number" onChange={(value) => setForm((current) => ({ ...current, machineNumber: value }))} placeholder="CNC-08" value={form.machineNumber} />
              <Field label="Part Name" onChange={(value) => setForm((current) => ({ ...current, partName: value }))} placeholder="Ring Cap" value={form.partName} />
              <Field label="Rejection Qty." onChange={(value) => setForm((current) => ({ ...current, rejectionQuantity: Number(value || 0) }))} placeholder="1" type="number" value={String(form.rejectionQuantity)} />
              <Field label="Reason" onChange={(value) => setForm((current) => ({ ...current, reason: value }))} placeholder="Thread not OK" value={form.reason} />
              <Field label="Cause" onChange={(value) => setForm((current) => ({ ...current, cause: value }))} placeholder="Variation" value={form.cause} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">CR / MR</span>
                <select
                  className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setForm((current) => ({ ...current, crMr: event.target.value as QualityRejection["crMr"] }))}
                  value={form.crMr}
                >
                  <option value="MR">MR</option>
                  <option value="CR">CR</option>
                </select>
              </label>
              <label className="block md:col-span-2 xl:col-span-3">
                <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
                <textarea
                  className="min-h-24 w-full rounded-xl border border-border px-3 py-2 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
                  value={form.remarks}
                />
              </label>
              <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
                <Button className="h-11 rounded-xl" disabled={!form.serialNumber || !form.machineNumber || !form.partName || !form.reason || !form.cause} type="submit">
                  <Save size={16} />
                  Save Changes
                </Button>
                <button
                  className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700"
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialForm);
                    setMessage("");
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

function withoutDeletedIds<T extends { id: number }>(items: T[], deletedIds: Set<number>): T[] {
  return items.filter((item) => !deletedIds.has(item.id));
}

const qualityExportColumns = [
  { label: "Date", value: (row: QualityRejection) => formatDate(row.date) },
  { label: "Shift", value: (row: QualityRejection) => row.shift },
  { label: "S. No.", value: (row: QualityRejection) => row.serialNumber },
  { label: "Machine Number", value: (row: QualityRejection) => row.machineNumber },
  { label: "Part Name", value: (row: QualityRejection) => row.partName },
  { label: "Rejection Qty.", value: (row: QualityRejection) => row.rejectionQuantity },
  { label: "Reason", value: (row: QualityRejection) => row.reason },
  { label: "Cause", value: (row: QualityRejection) => row.cause },
  { label: "CR / MR", value: (row: QualityRejection) => row.crMr },
  { label: "Remarks", value: (row: QualityRejection) => row.remarks || "-" },
  { label: "Updated", value: (row: QualityRejection) => formatDateTime(row.timestamp) },
];

function Summary({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Pagination({
  count,
  page,
  setPage,
  total,
  totalPages,
}: Readonly<{
  count: number;
  page: number;
  setPage: (updater: (current: number) => number) => void;
  total: number;
  totalPages: number;
}>) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      <p className="text-sm text-slate-500">
        Page {page} of {totalPages} · Showing {count} of {total}
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
  );
}

function Field({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: Readonly<{
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
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
        placeholder={placeholder}
        required={label !== "Remarks"}
        type={type}
        value={value}
      />
    </label>
  );
}
