"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";

type MaintenanceJob = {
  id: string;
  machine: string;
  team: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  breakdownFrom: string;
  breakdownTo: string;
  reason: string;
  dueBy: string;
};

const storageKey = "naptech_maintenance_jobs";
const PAGE_SIZE = 10;

const defaultMaintenanceJobs: MaintenanceJob[] = [
  { id: "MT-104", machine: "CNC-12", team: "Mechanical", priority: "High", status: "In Progress", breakdownFrom: "2026-05-27T13:20:00.000Z", breakdownTo: "2026-05-27T15:00:00.000Z", reason: "Spindle vibration", dueBy: "2026-05-27T15:00:00.000Z" },
  { id: "MT-105", machine: "Press-07", team: "Electrical", priority: "Medium", status: "Pending", breakdownFrom: "2026-05-27T16:45:00.000Z", breakdownTo: "2026-05-27T18:00:00.000Z", reason: "Panel trip", dueBy: "2026-05-27T18:00:00.000Z" },
  { id: "MT-106", machine: "Conveyor-03", team: "Utilities", priority: "Low", status: "Completed", breakdownFrom: "2026-05-27T09:15:00.000Z", breakdownTo: "2026-05-27T10:00:00.000Z", reason: "Belt alignment", dueBy: "2026-05-27T10:00:00.000Z" },
];

const initialForm = {
  machine: "",
  team: "",
  priority: "Medium" as MaintenanceJob["priority"],
  status: "Pending" as MaintenanceJob["status"],
  breakdownFrom: "",
  breakdownTo: "",
  reason: "",
  dueBy: "",
};

export default function MaintenancePage() {
  const [maintenanceJobs, setMaintenanceJobs] = useState<MaintenanceJob[]>(defaultMaintenanceJobs);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "maintenance");
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return maintenanceJobs;
    return maintenanceJobs.filter((job) =>
      [
        job.id,
        job.machine,
        job.team,
        job.priority,
        job.status,
        job.reason,
        job.breakdownFrom,
        job.breakdownTo,
        job.dueBy,
      ].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [maintenanceJobs, search]);
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const paginatedJobs = filteredJobs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    const initialSearch = new URLSearchParams(window.location.search).get("search")?.trim();
    if (initialSearch) {
      setSearch(initialSearch);
    }

    const savedRows = window.localStorage.getItem(storageKey);
    if (!savedRows) return;

    try {
      const parsedRows = JSON.parse(savedRows) as Array<Partial<MaintenanceJob>>;
      setMaintenanceJobs(parsedRows.map(normalizeMaintenanceJob));
    } catch {
      setMaintenanceJobs(defaultMaintenanceJobs);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (!isUserReady) {
    return (
      <DashboardShell>
        <Card className="rounded-2xl p-8 text-sm text-slate-500">Loading maintenance access...</Card>
      </DashboardShell>
    );
  }

  if (!canAccess) {
    return (
      <DashboardShell>
        <AccessDenied department="Maintenance" />
      </DashboardShell>
    );
  }

  function saveRows(rows: MaintenanceJob[]) {
    setMaintenanceJobs(rows);
    window.localStorage.setItem(storageKey, JSON.stringify(rows));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (editingId) {
      const rows = maintenanceJobs.map((job) =>
        job.id === editingId
          ? {
              ...job,
              machine: form.machine.trim(),
              team: form.team.trim(),
              priority: form.priority,
              status: form.status,
              breakdownFrom: new Date(form.breakdownFrom).toISOString(),
              breakdownTo: new Date(form.breakdownTo).toISOString(),
              reason: form.reason.trim(),
              dueBy: new Date(form.dueBy).toISOString(),
            }
          : job,
      );
      saveRows(rows);
      setEditingId(null);
      setForm(initialForm);
      setMessage("Maintenance job updated.");
      return;
    }

    const newRow: MaintenanceJob = {
      id: `MT-${Date.now().toString().slice(-5)}`,
      machine: form.machine.trim(),
      team: form.team.trim(),
      priority: form.priority,
      status: form.status,
      breakdownFrom: new Date(form.breakdownFrom).toISOString(),
      breakdownTo: new Date(form.breakdownTo).toISOString(),
      reason: form.reason.trim(),
      dueBy: new Date(form.dueBy).toISOString(),
    };

    saveRows([newRow, ...maintenanceJobs]);
    setPage(1);
    setForm(initialForm);
    setMessage("Maintenance job saved to the table.");
  }

  function startEdit(job: MaintenanceJob) {
    setEditingId(job.id);
    setForm({
      machine: job.machine,
      team: job.team,
      priority: job.priority,
      status: job.status,
      breakdownFrom: job.breakdownFrom.slice(0, 16),
      breakdownTo: job.breakdownTo.slice(0, 16),
      reason: job.reason,
      dueBy: job.dueBy.slice(0, 16),
    });
    setMessage(`Editing ${job.id}.`);
  }

  function handleDelete(job: MaintenanceJob) {
    const confirmed = window.confirm(`Delete maintenance job ${job.id}?`);
    if (!confirmed) return;

    const rows = maintenanceJobs.filter((item) => item.id !== job.id);
    saveRows(rows);
    setPage((current) => Math.min(current, Math.max(1, Math.ceil(rows.length / PAGE_SIZE))));
    setMessage("Maintenance job deleted.");
  }

  function exportExcel() {
    downloadExcel("maintenance-jobs.xls", "Maintenance Jobs", maintenanceExportColumns, filteredJobs);
  }

  function exportPdf() {
    printPdf("Maintenance Jobs", maintenanceExportColumns, filteredJobs);
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
        description="Track machine breakdown duration, reason, team ownership, and due timelines."
        title="Maintenance"
      />

      <Card className="mb-5 rounded-2xl border-slate-200">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-xl bg-[#19C93B]/10 p-2 text-[#19C93B]">
            <Plus size={18} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Add maintenance job</h2>
            <p className="text-sm text-muted-foreground">Save machine breakdown duration and reason directly into the maintenance table.</p>
          </div>
        </div>

        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={handleSubmit}>
          <Field label="Machine" onChange={(value) => setForm((current) => ({ ...current, machine: value }))} placeholder="CNC-12" value={form.machine} />
          <Field label="Team" onChange={(value) => setForm((current) => ({ ...current, team: value }))} placeholder="Mechanical" value={form.team} />
          <Field label="Breakdown From" onChange={(value) => setForm((current) => ({ ...current, breakdownFrom: value }))} placeholder="" type="datetime-local" value={form.breakdownFrom} />
          <Field label="Breakdown To" onChange={(value) => setForm((current) => ({ ...current, breakdownTo: value }))} placeholder="" type="datetime-local" value={form.breakdownTo} />
          <Field label="Reason" onChange={(value) => setForm((current) => ({ ...current, reason: value }))} placeholder="Spindle vibration" value={form.reason} />
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Priority</span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MaintenanceJob["priority"] }))}
              value={form.priority}
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-800">Status</span>
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MaintenanceJob["status"] }))}
              value={form.status}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </label>
          <Field label="Due By" onChange={(value) => setForm((current) => ({ ...current, dueBy: value }))} placeholder="" type="datetime-local" value={form.dueBy} />
          <Button className="h-11 self-end rounded-xl" disabled={!form.machine || !form.team || !form.breakdownFrom || !form.breakdownTo || !form.reason || !form.dueBy} type="submit">
            <Save size={16} />
            Save Job
          </Button>
        </form>

        {message ? <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</p> : null}
      </Card>

      <Card>
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-slate-950">Maintenance Jobs</h2>
          <p className="text-sm text-muted-foreground">Search breakdown rows by machine, team, reason, priority, or status.</p>
        </div>
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              className="h-11 w-full rounded-xl border border-border bg-white pl-10 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search machine, team, reason, status"
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
          <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4">Job ID</th>
                <th className="py-3 pr-4">Machine</th>
                <th className="py-3 pr-4">Team</th>
                <th className="py-3 pr-4">Breakdown From</th>
                <th className="py-3 pr-4">Breakdown To</th>
                <th className="py-3 pr-4">Reason</th>
                <th className="py-3 pr-4">Priority</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Due By</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedJobs.map((job) => (
                <tr className="border-b border-border last:border-0" key={job.id}>
                  <td className="py-4 pr-4 font-semibold text-slate-950">{job.id}</td>
                  <td className="py-4 pr-4 text-slate-700">{job.machine}</td>
                  <td className="py-4 pr-4 text-slate-700">{job.team}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.breakdownFrom)}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.breakdownTo)}</td>
                  <td className="py-4 pr-4 text-slate-700">{job.reason}</td>
                  <td className="py-4 pr-4">
                    <Badge tone={job.priority === "High" ? "danger" : job.priority === "Medium" ? "warning" : "neutral"}>
                      {job.priority}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4">
                    <Badge tone={job.status === "Completed" ? "success" : job.status === "In Progress" ? "warning" : "neutral"}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.dueBy)}</td>
                  <td className="py-4 pr-4">
                    <button
                      className="mr-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => startEdit(job)}
                      type="button"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    {canDelete ? (
                      <button
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        onClick={() => handleDelete(job)}
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
        <Pagination
          count={paginatedJobs.length}
          page={page}
          setPage={setPage}
          total={filteredJobs.length}
          totalPages={totalPages}
        />
      </Card>
      {editingId ? (
        <div className="modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4">
          <Card className="modal-card max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-2xl shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Edit maintenance job</h2>
                <p className="text-sm text-muted-foreground">Update machine breakdown details, ownership, and timeline.</p>
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
              <Field label="Machine" onChange={(value) => setForm((current) => ({ ...current, machine: value }))} placeholder="CNC-12" value={form.machine} />
              <Field label="Team" onChange={(value) => setForm((current) => ({ ...current, team: value }))} placeholder="Mechanical" value={form.team} />
              <Field label="Breakdown From" onChange={(value) => setForm((current) => ({ ...current, breakdownFrom: value }))} placeholder="" type="datetime-local" value={form.breakdownFrom} />
              <Field label="Breakdown To" onChange={(value) => setForm((current) => ({ ...current, breakdownTo: value }))} placeholder="" type="datetime-local" value={form.breakdownTo} />
              <Field label="Reason" onChange={(value) => setForm((current) => ({ ...current, reason: value }))} placeholder="Spindle vibration" value={form.reason} />
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Priority</span>
                <select
                  className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as MaintenanceJob["priority"] }))}
                  value={form.priority}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-800">Status</span>
                <select
                  className="h-11 w-full rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MaintenanceJob["status"] }))}
                  value={form.status}
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </label>
              <Field label="Due By" onChange={(value) => setForm((current) => ({ ...current, dueBy: value }))} placeholder="" type="datetime-local" value={form.dueBy} />
              <div className="flex items-end gap-3 md:col-span-2 xl:col-span-3">
                <Button className="h-11 rounded-xl" disabled={!form.machine || !form.team || !form.breakdownFrom || !form.breakdownTo || !form.reason || !form.dueBy} type="submit">
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

const maintenanceExportColumns = [
  { label: "Job ID", value: (row: MaintenanceJob) => row.id },
  { label: "Machine", value: (row: MaintenanceJob) => row.machine },
  { label: "Team", value: (row: MaintenanceJob) => row.team },
  { label: "Breakdown From", value: (row: MaintenanceJob) => formatDateTime(row.breakdownFrom) },
  { label: "Breakdown To", value: (row: MaintenanceJob) => formatDateTime(row.breakdownTo) },
  { label: "Reason", value: (row: MaintenanceJob) => row.reason },
  { label: "Priority", value: (row: MaintenanceJob) => row.priority },
  { label: "Status", value: (row: MaintenanceJob) => row.status },
  { label: "Due By", value: (row: MaintenanceJob) => formatDateTime(row.dueBy) },
];

function normalizeMaintenanceJob(row: Partial<MaintenanceJob>): MaintenanceJob {
  const dueBy = row.dueBy || new Date().toISOString();
  return {
    id: row.id || `MT-${Date.now().toString().slice(-5)}`,
    machine: row.machine || "",
    team: row.team || "",
    priority: row.priority || "Medium",
    status: row.status || "Pending",
    breakdownFrom: row.breakdownFrom || dueBy,
    breakdownTo: row.breakdownTo || dueBy,
    reason: row.reason || "Not specified",
    dueBy,
  };
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
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
