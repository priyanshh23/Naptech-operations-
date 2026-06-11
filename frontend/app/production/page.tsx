"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Loader2, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Button, Card, MobileRecordCard, PageHeader } from "@/components/ui";
import { createProductionEntries, deleteProductionEntry, getMachineAnalytics, getProductionEntries, getProductionSummary, updateProductionEntry } from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDate } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type { MachineAnalyticsRow, ProductionEntry, ProductionEntryPayload, ProductionSummary } from "@/lib/types";

type DraftRow = ProductionEntryPayload & { rowId: string };

const LOG_PAGE_SIZE = 10;
const MACHINE_PAGE_SIZE = 4;
const today = new Date().toISOString().slice(0, 10);
const emptyDraft = (rowId = `row-${Date.now()}-${Math.random().toString(16).slice(2)}`): DraftRow => ({
  rowId,
  date: today,
  shift: "A",
  machine_number: "",
  operator_name: "",
  part_number: "",
  part_name: "",
  cycle_time_seconds: 0,
  target_per_hour: 0,
  daily_target: 0,
  actual_production: 0,
  remarks: "",
});

export default function ProductionPage() {
  const [draftRows, setDraftRows] = useState<DraftRow[]>([
    emptyDraft("row-1"),
    emptyDraft("row-2"),
    emptyDraft("row-3"),
  ]);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [summary, setSummary] = useState<ProductionSummary | null>(null);
  const [machineAnalytics, setMachineAnalytics] = useState<MachineAnalyticsRow[]>([]);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [logsPage, setLogsPage] = useState(1);
  const [machinePage, setMachinePage] = useState(1);
  const [editingEntry, setEditingEntry] = useState<ProductionEntry | null>(null);
  const [editForm, setEditForm] = useState<ProductionEntryPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const deletedEntryIdsRef = useRef<Set<number>>(new Set());
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "production");

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search")?.trim();
    if (initialSearch) {
      setSearch(initialSearch);
    }
    void loadProductionData();
  }, [dateFrom, dateTo]);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) =>
      [
        entry.machine_number,
        entry.operator_name,
        entry.part_number,
        entry.part_name,
        entry.remarks ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [entries, search]);

  const logsTotalPages = Math.max(1, Math.ceil(filteredEntries.length / LOG_PAGE_SIZE));
  const paginatedEntries = filteredEntries.slice((logsPage - 1) * LOG_PAGE_SIZE, logsPage * LOG_PAGE_SIZE);
  const machineTotalPages = Math.max(1, Math.ceil(machineAnalytics.length / MACHINE_PAGE_SIZE));
  const paginatedMachines = machineAnalytics.slice((machinePage - 1) * MACHINE_PAGE_SIZE, machinePage * MACHINE_PAGE_SIZE);

  useEffect(() => {
    setLogsPage(1);
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    setMachinePage(1);
  }, [dateFrom, dateTo]);

  if (!isUserReady) {
    return (
      <DashboardShell>
        <Card className="rounded-2xl p-8 text-sm text-slate-500">Loading production access...</Card>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell>
        <AccessDenied department="Production" />
      </DashboardShell>
    );
  }

  async function loadProductionData() {
    setIsLoading(true);
    setError("");

    try {
      const params = {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };
      const [entryResponse, summaryResponse, analyticsResponse] = await Promise.all([
        getProductionEntries(params),
        getProductionSummary(params),
        getMachineAnalytics(params),
      ]);
      setEntries(withoutDeletedIds(entryResponse.items, deletedEntryIdsRef.current));
      setSummary(summaryResponse);
      setMachineAnalytics(analyticsResponse);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to load production data.";
      setError(detail);
    } finally {
      setIsLoading(false);
    }
  }

  function updateDraft(rowId: string, field: keyof ProductionEntryPayload, value: string) {
    setDraftRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              [field]: isNumericField(field) ? Number(value || 0) : value,
            }
          : row,
      ),
    );
  }

  function removeDraft(rowId: string) {
    setDraftRows((current) => (current.length === 1 ? current : current.filter((row) => row.rowId !== rowId)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    const validRows = draftRows
      .map(({ rowId: _rowId, ...row }) => ({
        ...row,
        machine_number: row.machine_number.trim(),
        operator_name: row.operator_name.trim(),
        part_number: row.part_number.trim(),
        part_name: row.part_name.trim(),
        remarks: row.remarks?.trim() || null,
      }))
      .filter((row) => row.machine_number && row.operator_name && row.part_number && row.part_name);

    if (!validRows.length) {
      setError("Fill at least one complete production row before saving.");
      setIsSaving(false);
      return;
    }

    try {
      await createProductionEntries(validRows);
      setDraftRows([emptyDraft(), emptyDraft(), emptyDraft()]);
      setMessage(`${validRows.length} production row${validRows.length > 1 ? "s" : ""} saved.`);
      await loadProductionData();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Production rows could not be saved.";
      setError(detail);
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(entry: ProductionEntry) {
    setEditingEntry(entry);
    setEditForm({
      date: entry.date.slice(0, 10),
      shift: entry.shift,
      machine_number: entry.machine_number,
      operator_name: entry.operator_name,
      part_number: entry.part_number,
      part_name: entry.part_name,
      cycle_time_seconds: entry.cycle_time_seconds,
      target_per_hour: entry.target_per_hour,
      daily_target: entry.daily_target,
      actual_production: entry.actual_production,
      remarks: entry.remarks ?? "",
    });
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEntry || !editForm) return;

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      await updateProductionEntry(editingEntry.id, {
        ...editForm,
        machine_number: editForm.machine_number.trim(),
        operator_name: editForm.operator_name.trim(),
        part_number: editForm.part_number.trim(),
        part_name: editForm.part_name.trim(),
        remarks: editForm.remarks?.trim() || null,
      });
      setEditingEntry(null);
      setEditForm(null);
      setMessage("Production entry updated.");
      await loadProductionData();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Production row could not be updated.";
      setError(detail);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(entry: ProductionEntry) {
    if (deletedEntryIdsRef.current.has(entry.id)) return;

    const confirmed = window.confirm(`Delete production entry for ${entry.machine_number} / ${entry.part_name}?`);
    if (!confirmed) return;

    setError("");
    setMessage("");
    const previousEntries = entries;
    deletedEntryIdsRef.current.add(entry.id);
    setEntries((current) => current.filter((item) => item.id !== entry.id));

    try {
      await deleteProductionEntry(entry.id);
      setMessage("Production entry deleted.");
      void loadProductionData();
    } catch (error) {
      deletedEntryIdsRef.current.delete(entry.id);
      setEntries(previousEntries);
      setError(error instanceof Error ? error.message : "Production entry could not be deleted.");
    }
  }

  function exportExcel() {
    downloadExcel("daily-production-record.xls", "Daily Production Record", productionExportColumns, filteredEntries);
  }

  function exportPdf() {
    printPdf("Daily Production Record", productionExportColumns, filteredEntries);
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
        description="Enter daily machine production in the same sheet-style format used on the shop floor."
        title="Production"
      />

      <section className="metric-grid mb-6">
        <Metric label="Total Production Today" value={summary?.total_daily_production.toLocaleString("en-IN") ?? "0"} />
        <Metric label="Average Machine Efficiency" value={`${summary?.average_machine_efficiency ?? 0}%`} />
        <Metric label="Best Performing Machine" value={summary?.best_performing_machine ?? "-"} />
        <Metric label="Underperforming Machines" value={String(summary?.underperforming_machines ?? 0)} />
      </section>

      <section className="mb-6 grid gap-5 xl:grid-cols-2">
        <Card className="rounded-2xl border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Production vs Target</h2>
          <div className="mt-4 h-72">
            <ProductionChart data={summary?.production_vs_target ?? []} />
          </div>
        </Card>
        <Card className="rounded-2xl border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Machine-wise Production</h2>
          <div className="mt-4 h-72">
            <ProductionChart data={summary?.machine_wise_production ?? []} />
          </div>
        </Card>
      </section>

      <Card className="mb-6 min-w-0 rounded-2xl border-slate-200">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Daily production record</h2>
            <p className="text-sm text-muted-foreground">Fill multiple rows quickly. Efficiency is calculated automatically.</p>
          </div>
          <Button onClick={() => setDraftRows((current) => [...current, emptyDraft()])}>
            <Plus size={16} />
            Add Row
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="w-full max-w-full space-y-3 overflow-hidden md:hidden">
            {draftRows.map((row, index) => (
              <div className="w-full max-w-full overflow-hidden rounded-2xl border border-border bg-white p-4 dark:bg-white/[0.04]" key={row.rowId}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-950">Row {index + 1}</p>
                  <button
                    className="inline-flex h-9 items-center rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    onClick={() => removeDraft(row.rowId)}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-800">Shift</span>
                    <select
                      className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none"
                      onChange={(event) => updateDraft(row.rowId, "shift", event.target.value)}
                      value={row.shift}
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                  </label>
                  <DraftField field="date" label="Date" row={row} type="date" updateDraft={updateDraft} />
                  <DraftField field="machine_number" label="Machine Number" placeholder="CNC-01" row={row} updateDraft={updateDraft} />
                  <DraftField field="operator_name" label="Operator" placeholder="Rahul" row={row} updateDraft={updateDraft} />
                  <DraftField field="part_number" label="Part Number" placeholder="TA-204" row={row} updateDraft={updateDraft} />
                  <DraftField field="part_name" label="Part Name" placeholder="Torque Arm" row={row} updateDraft={updateDraft} />
                  <DraftField field="cycle_time_seconds" label="Total Time (sec)" row={row} type="number" updateDraft={updateDraft} />
                  <DraftField field="target_per_hour" label="Target/Hour" row={row} type="number" updateDraft={updateDraft} />
                  <DraftField field="daily_target" label="Daily Target" row={row} type="number" updateDraft={updateDraft} />
                  <DraftField field="actual_production" label="Actual Production" row={row} type="number" updateDraft={updateDraft} />
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                    Efficiency: {getEfficiency(row.actual_production, row.daily_target)}%
                  </div>
                  <DraftField field="remarks" label="Remarks" placeholder="Delay, tool change..." row={row} updateDraft={updateDraft} />
                </div>
              </div>
            ))}
          </div>

          <div className="table-scroll hidden max-h-[430px] rounded-xl border border-border md:block">
            <table className="data-entry-table data-table w-full min-w-[1960px] border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[110px]" />
                <col className="w-[180px]" />
                <col className="w-[180px]" />
                <col className="w-[170px]" />
                <col className="w-[170px]" />
                <col className="w-[190px]" />
                <col className="w-[170px]" />
                <col className="w-[150px]" />
                <col className="w-[150px]" />
                <col className="w-[180px]" />
                <col className="w-[130px]" />
                <col className="w-[220px]" />
                <col className="w-[100px]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-white dark:bg-[#07111A]">
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-3 pr-3">Shift</th>
                  <th className="py-3 pr-3">Date</th>
                  <th className="py-3 pr-3">Machine Number</th>
                  <th className="py-3 pr-3">Operator</th>
                  <th className="py-3 pr-3">Part Number</th>
                  <th className="py-3 pr-3">Part Name</th>
                  <th className="py-3 pr-3">Total Time (sec)</th>
                  <th className="py-3 pr-3">Target/Hour</th>
                  <th className="py-3 pr-3">Daily Target</th>
                  <th className="py-3 pr-3">Actual Production</th>
                  <th className="py-3 pr-3">Efficiency %</th>
                  <th className="py-3 pr-3">Remarks</th>
                  <th className="py-3 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {draftRows.map((row) => (
                  <tr className="border-b border-border last:border-0" key={row.rowId}>
                    <td className="py-3 pr-3">
                      <select
                        className="h-10 w-20 rounded-md border border-border bg-white px-2 outline-none"
                        onChange={(event) => updateDraft(row.rowId, "shift", event.target.value)}
                        value={row.shift}
                      >
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </td>
                    <EditableCell field="date" row={row} type="date" updateDraft={updateDraft} />
                    <EditableCell field="machine_number" placeholder="CNC-01" row={row} updateDraft={updateDraft} />
                    <EditableCell field="operator_name" placeholder="Rahul" row={row} updateDraft={updateDraft} />
                    <EditableCell field="part_number" placeholder="TA-204" row={row} updateDraft={updateDraft} />
                    <EditableCell field="part_name" placeholder="Torque Arm" row={row} updateDraft={updateDraft} />
                    <EditableCell field="cycle_time_seconds" row={row} type="number" updateDraft={updateDraft} />
                    <EditableCell field="target_per_hour" row={row} type="number" updateDraft={updateDraft} />
                    <EditableCell field="daily_target" row={row} type="number" updateDraft={updateDraft} />
                    <EditableCell field="actual_production" row={row} type="number" updateDraft={updateDraft} />
                    <td className="py-3 pr-3 font-semibold text-slate-950">
                      {getEfficiency(row.actual_production, row.daily_target)}%
                    </td>
                    <EditableCell field="remarks" placeholder="Delay, tool change..." row={row} updateDraft={updateDraft} />
                    <td className="table-actions py-3 pr-3">
                      <button
                        className="inline-flex h-9 items-center rounded-md border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => removeDraft(row.rowId)}
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {isSaving ? "Saving..." : "Save Production Rows"}
            </Button>
            <button
              className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-slate-700"
              onClick={() => setDraftRows([emptyDraft(), emptyDraft(), emptyDraft()])}
              type="button"
            >
              Clear Sheet
            </button>
          </div>
        </form>
      </Card>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <Card className="min-w-0 rounded-2xl border-slate-200">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Production logs</h2>
              <p className="text-sm text-muted-foreground">Saved rows from the production sheet workflow.</p>
            </div>
            <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-border bg-white px-3 md:max-w-sm">
              <Search size={18} className="text-muted-foreground" />
              <input
                className="w-full outline-none"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search machine, part, operator"
                value={search}
              />
            </label>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[repeat(2,220px)_auto_auto] md:items-end">
            <DateFilter label="From Date" onChange={setDateFrom} value={dateFrom} />
            <DateFilter label="To Date" min={dateFrom || undefined} onChange={setDateTo} value={dateTo} />
            <button
              className="h-11 rounded-xl border border-border px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
              onClick={() => void loadProductionData()}
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

          <div className="mobile-record-list md:hidden">
            {isLoading ? (
              <div className="rounded-2xl border border-border p-4 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} />
                  Loading production rows...
                </span>
              </div>
            ) : filteredEntries.length ? (
              paginatedEntries.map((entry) => (
                <MobileRecordCard
                  actions={
                    <>
                      <button
                        className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        onClick={() => startEdit(entry)}
                        type="button"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      {canDelete ? (
                        <button
                          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                          onClick={() => void handleDelete(entry)}
                          type="button"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      ) : null}
                    </>
                  }
                  badge={<Badge tone={entry.efficiency_percent >= 100 ? "success" : entry.efficiency_percent >= 85 ? "warning" : "danger"}>{entry.efficiency_percent}%</Badge>}
                  key={entry.id}
                  rows={[
                    { label: "Shift", value: entry.shift },
                    { label: "Part No.", value: entry.part_number },
                    { label: "Target", value: entry.daily_target.toLocaleString("en-IN") },
                    { label: "Actual", value: entry.actual_production.toLocaleString("en-IN") },
                    { label: "Operator", value: entry.operator_name },
                    { label: "Remarks", value: entry.remarks || "-" },
                  ]}
                  subtitle={`${formatDate(entry.date)} · ${entry.part_name}`}
                  title={entry.machine_number}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-border p-4 text-sm text-slate-500">No production entries found.</div>
            )}
          </div>

          <div className="table-scroll hidden md:block">
            <table className="data-table w-full min-w-[1060px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Shift</th>
                  <th className="py-3 pr-4">Machine</th>
                  <th className="py-3 pr-4">Part No.</th>
                  <th className="py-3 pr-4">Part Name</th>
                  <th className="py-3 pr-4">Target</th>
                  <th className="py-3 pr-4">Actual</th>
                  <th className="py-3 pr-4">Efficiency</th>
                  <th className="py-3 pr-4">Operator</th>
                  <th className="py-3 pr-4">Remarks</th>
                  <th className="py-3 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="py-10 text-center text-slate-500" colSpan={11}>
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} />
                        Loading production rows...
                      </span>
                    </td>
                  </tr>
                ) : filteredEntries.length ? (
                  paginatedEntries.map((entry) => (
                    <tr className="border-b border-border last:border-0" key={entry.id}>
                      <td className="py-4 pr-4 text-slate-700">{formatDate(entry.date)}</td>
                      <td className="py-4 pr-4 text-slate-700">{entry.shift}</td>
                      <td className="py-4 pr-4 font-semibold text-slate-950">{entry.machine_number}</td>
                      <td className="py-4 pr-4 text-slate-700">{entry.part_number}</td>
                      <td className="wrap-cell py-4 pr-4 text-slate-700">{entry.part_name}</td>
                      <td className="py-4 pr-4 text-slate-700">{entry.daily_target.toLocaleString("en-IN")}</td>
                      <td className="py-4 pr-4 text-slate-700">{entry.actual_production.toLocaleString("en-IN")}</td>
                      <td className="table-actions py-4 pr-4">
                        <Badge tone={entry.efficiency_percent >= 100 ? "success" : entry.efficiency_percent >= 85 ? "warning" : "danger"}>
                          {entry.efficiency_percent}%
                        </Badge>
                      </td>
                      <td className="py-4 pr-4 text-slate-700">{entry.operator_name}</td>
                      <td className="wrap-cell py-4 pr-4 text-slate-700">{entry.remarks || "-"}</td>
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
                  ))
                ) : (
                  <tr>
                    <td className="py-10 text-center text-slate-500" colSpan={11}>
                      No production entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            count={paginatedEntries.length}
            page={logsPage}
            setPage={setLogsPage}
            total={filteredEntries.length}
            totalPages={logsTotalPages}
          />
        </Card>

        <Card className="rounded-2xl border-slate-200">
          <h2 className="text-lg font-semibold text-slate-950">Machine analytics</h2>
          <div className="mt-4 space-y-3">
            {paginatedMachines.map((machine) => (
              <div className="rounded-xl border border-border p-4" key={machine.machine_number}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-950">{machine.machine_number}</p>
                  <Badge tone={machine.is_underperforming ? "warning" : "success"}>
                    {machine.efficiency_percent}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#19C93B]"
                    style={{ width: `${Math.min(100, machine.efficiency_percent)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-slate-600">
                  Actual {machine.actual_production.toLocaleString("en-IN")} / Target {machine.daily_target.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
          <Pagination
            count={paginatedMachines.length}
            page={machinePage}
            setPage={setMachinePage}
            total={machineAnalytics.length}
            totalPages={machineTotalPages}
          />
        </Card>
      </section>

      {editingEntry && editForm ? (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <Card className="modal-card max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Edit production entry</h2>
                <p className="text-sm text-muted-foreground">Update machine, part, target, actual production, and remarks.</p>
              </div>
              <button className="rounded-xl border border-border p-2 text-slate-600" onClick={() => setEditingEntry(null)} type="button">
                <X size={16} />
              </button>
            </div>
            <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleEditSubmit}>
              <EditField label="Date" onChange={(value) => setEditForm((current) => current && ({ ...current, date: value }))} type="date" value={editForm.date} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Shift</span>
                <select
                  className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setEditForm((current) => current && ({ ...current, shift: event.target.value }))}
                  value={editForm.shift}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </label>
              <EditField label="Machine Number" onChange={(value) => setEditForm((current) => current && ({ ...current, machine_number: value }))} value={editForm.machine_number} />
              <EditField label="Operator" onChange={(value) => setEditForm((current) => current && ({ ...current, operator_name: value }))} value={editForm.operator_name} />
              <EditField label="Part Number" onChange={(value) => setEditForm((current) => current && ({ ...current, part_number: value }))} value={editForm.part_number} />
              <EditField label="Part Name" onChange={(value) => setEditForm((current) => current && ({ ...current, part_name: value }))} value={editForm.part_name} />
              <EditField label="Total Time (sec)" onChange={(value) => setEditForm((current) => current && ({ ...current, cycle_time_seconds: Number(value || 0) }))} type="number" value={String(editForm.cycle_time_seconds)} />
              <EditField label="Target/Hour" onChange={(value) => setEditForm((current) => current && ({ ...current, target_per_hour: Number(value || 0) }))} type="number" value={String(editForm.target_per_hour)} />
              <EditField label="Daily Target" onChange={(value) => setEditForm((current) => current && ({ ...current, daily_target: Number(value || 0) }))} type="number" value={String(editForm.daily_target)} />
              <EditField label="Actual Production" onChange={(value) => setEditForm((current) => current && ({ ...current, actual_production: Number(value || 0) }))} type="number" value={String(editForm.actual_production)} />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
                <textarea
                  className="form-control min-h-24 rounded-xl border border-border px-3 py-2 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setEditForm((current) => current && ({ ...current, remarks: event.target.value }))}
                  value={editForm.remarks ?? ""}
                />
              </label>
              <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
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

const productionExportColumns = [
  { label: "Date", value: (row: ProductionEntry) => formatDate(row.date) },
  { label: "Shift", value: (row: ProductionEntry) => row.shift },
  { label: "Machine Number", value: (row: ProductionEntry) => row.machine_number },
  { label: "Operator", value: (row: ProductionEntry) => row.operator_name },
  { label: "Part Number", value: (row: ProductionEntry) => row.part_number },
  { label: "Part Name", value: (row: ProductionEntry) => row.part_name },
  { label: "Total Time (sec)", value: (row: ProductionEntry) => row.cycle_time_seconds },
  { label: "Target/Hour", value: (row: ProductionEntry) => row.target_per_hour },
  { label: "Daily Target", value: (row: ProductionEntry) => row.daily_target },
  { label: "Actual Production", value: (row: ProductionEntry) => row.actual_production },
  { label: "Efficiency %", value: (row: ProductionEntry) => row.efficiency_percent },
  { label: "Remarks", value: (row: ProductionEntry) => row.remarks || "-" },
  { label: "Created By", value: (row: ProductionEntry) => row.created_by },
];

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

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Card className="rounded-2xl border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </Card>
  );
}

function ProductionChart({ data }: Readonly<{ data: Array<{ label: string; target: number; actual: number }> }>) {
  return (
    <ResponsiveContainer height="100%" width="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="targetBarGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.78} />
          </linearGradient>
          <linearGradient id="actualBarGradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#A3FF12" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#19C93B" stopOpacity={0.86} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="4 6" vertical={false} />
        <XAxis axisLine={false} dataKey="label" tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
        <YAxis axisLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} tickLine={false} />
        <Tooltip content={<ProductionTooltip />} cursor={{ fill: "rgba(14, 165, 233, 0.10)" }} />
        <Bar
          animationBegin={120}
          animationDuration={950}
          animationEasing="ease-out"
          dataKey="target"
          fill="url(#targetBarGradient)"
          name="Target"
          radius={[7, 7, 0, 0]}
        />
        <Bar
          animationBegin={260}
          animationDuration={1100}
          animationEasing="ease-out"
          dataKey="actual"
          fill="url(#actualBarGradient)"
          name="Actual"
          radius={[7, 7, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ProductionTooltip({
  active,
  label,
  payload,
}: Readonly<{
  active?: boolean;
  label?: string | number;
  payload?: Array<{ color?: string; name?: string | number; value?: string | number }>;
}>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#07111A]/95">
      <p className="mb-1 font-semibold text-slate-900 dark:text-white">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div className="flex items-center gap-2" key={`${item.name}-${item.value}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: item.color ?? "#19C93B" }} />
            <span className="text-slate-500 dark:text-slate-300">{item.name}</span>
            <span className="font-semibold text-slate-950 dark:text-white">{Number(item.value ?? 0).toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableCell({
  field,
  placeholder,
  row,
  type = "text",
  updateDraft,
}: Readonly<{
  field: keyof ProductionEntryPayload;
  placeholder?: string;
  row: DraftRow;
  type?: string;
  updateDraft: (rowId: string, field: keyof ProductionEntryPayload, value: string) => void;
}>) {
  return (
    <td className="py-3 pr-3">
      <input
        className="h-10 w-full rounded-md border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => updateDraft(row.rowId, field, event.target.value)}
        placeholder={placeholder}
        required={field !== "remarks"}
        type={type}
        value={String(row[field] ?? "")}
      />
    </td>
  );
}

function DraftField({
  field,
  label,
  placeholder,
  row,
  type = "text",
  updateDraft,
}: Readonly<{
  field: keyof ProductionEntryPayload;
  label: string;
  placeholder?: string;
  row: DraftRow;
  type?: string;
  updateDraft: (rowId: string, field: keyof ProductionEntryPayload, value: string) => void;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input
        className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => updateDraft(row.rowId, field, event.target.value)}
        placeholder={placeholder}
        required={field !== "remarks"}
        type={type}
        value={String(row[field] ?? "")}
      />
    </label>
  );
}

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
        className="form-control h-11 rounded-xl border border-border px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={type === "number" ? 0 : undefined}
        onChange={(event) => onChange(event.target.value)}
        required
        type={type}
        value={value}
      />
    </label>
  );
}

function DateFilter({
  label,
  min,
  onChange,
  value,
}: Readonly<{
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        className="form-control h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        min={min}
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

function getEfficiency(actual: number, target: number) {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 1000) / 10;
}

function isNumericField(field: keyof ProductionEntryPayload) {
  return ["cycle_time_seconds", "target_per_hour", "daily_target", "actual_production"].includes(field);
}

function withoutDeletedIds<T extends { id: number }>(items: T[], deletedIds: Set<number>): T[] {
  return items.filter((item) => !deletedIds.has(item.id));
}
