"use client";

import { ChevronLeft, ChevronRight, Download, FileText, Pencil, Plus, Save, Search, Trash2, X } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AccessDenied } from "@/components/dashboard/access-denied";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Badge, Button, Card, MobileRecordCard, PageHeader } from "@/components/ui";
import { createMaintenanceJob, deleteMaintenanceJob, getMaintenanceJobs, updateMaintenanceJob } from "@/lib/api";
import { downloadExcel, printPdf } from "@/lib/export-utils";
import { formatDateTime } from "@/lib/format";
import { canDeleteEntries, canUseDepartment, useStoredUser } from "@/lib/permissions";
import type { MaintenanceJob, MaintenanceJobPayload } from "@/lib/types";

const PAGE_SIZE = 10;

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
  const [maintenanceJobs, setMaintenanceJobs] = useState<MaintenanceJob[]>([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const deletedJobIdsRef = useRef<Set<number>>(new Set());
  const { isReady: isUserReady, user: currentUser } = useStoredUser();
  const canDelete = canDeleteEntries(currentUser);
  const canAccess = canUseDepartment(currentUser, "maintenance");
  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return maintenanceJobs;
    return maintenanceJobs.filter((job) =>
      [
        job.jobCode,
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
    void loadMaintenanceJobs();
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

  async function loadMaintenanceJobs() {
    setError("");
    try {
      const response = await getMaintenanceJobs();
      setMaintenanceJobs(withoutDeletedIds(response.items, deletedJobIdsRef.current));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load maintenance jobs.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (editingId) {
      try {
        await updateMaintenanceJob(editingId, normalizeForm());
        await loadMaintenanceJobs();
        setEditingId(null);
        setForm(initialForm);
        setMessage("Maintenance job updated.");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Maintenance job could not be updated.");
      }
      return;
    }

    try {
      await createMaintenanceJob(normalizeForm());
      await loadMaintenanceJobs();
      setPage(1);
      setForm(initialForm);
      setMessage("Maintenance job saved to the table.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Maintenance job could not be saved.");
    }
  }

  function normalizeForm(): MaintenanceJobPayload {
    return {
      machine: form.machine.trim(),
      team: form.team.trim(),
      priority: form.priority,
      status: form.status,
      breakdownFrom: new Date(form.breakdownFrom).toISOString(),
      breakdownTo: new Date(form.breakdownTo).toISOString(),
      reason: form.reason.trim(),
      dueBy: new Date(form.dueBy).toISOString(),
    };
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
    setMessage(`Editing ${job.jobCode}.`);
  }

  async function handleDelete(job: MaintenanceJob) {
    if (deletedJobIdsRef.current.has(job.id)) return;

    const confirmed = window.confirm(`Delete maintenance job ${job.jobCode}?`);
    if (!confirmed) return;

    setError("");
    const previousJobs = maintenanceJobs;
    deletedJobIdsRef.current.add(job.id);
    setMaintenanceJobs((current) => {
      const nextJobs = current.filter((item) => item.id !== job.id);
      setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil(nextJobs.length / PAGE_SIZE))));
      return nextJobs;
    });

    try {
      await deleteMaintenanceJob(job.id);
      void loadMaintenanceJobs();
      setMessage("Maintenance job deleted.");
    } catch (error) {
      deletedJobIdsRef.current.delete(job.id);
      setMaintenanceJobs(previousJobs);
      setError(error instanceof Error ? error.message : "Maintenance job could not be deleted.");
    }
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
              className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
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
              className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
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
        {error ? <p className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p> : null}
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
              className="form-control h-11 rounded-xl border border-border bg-white pl-10 pr-10 text-sm outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
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
        <div className="mobile-record-list md:hidden">
          {paginatedJobs.length ? paginatedJobs.map((job) => (
            <MobileRecordCard
              actions={
                <>
                  <button
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => startEdit(job)}
                    type="button"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  {canDelete ? (
                    <button
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-100 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      onClick={() => void handleDelete(job)}
                      type="button"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  ) : null}
                </>
              }
              badge={<Badge tone={job.status === "Completed" ? "success" : job.status === "In Progress" ? "warning" : "neutral"}>{job.status}</Badge>}
              key={job.id}
              rows={[
                { label: "Machine", value: job.machine },
                { label: "Team", value: job.team },
                { label: "From", value: formatDateTime(job.breakdownFrom) },
                { label: "To", value: formatDateTime(job.breakdownTo) },
                { label: "Reason", value: job.reason },
                { label: "Due", value: formatDateTime(job.dueBy) },
              ]}
              subtitle={<Badge tone={job.priority === "High" ? "danger" : job.priority === "Medium" ? "warning" : "neutral"}>{job.priority}</Badge>}
              title={job.jobCode}
            />
          )) : (
            <div className="rounded-2xl border border-border p-4 text-sm text-slate-500">No maintenance jobs found.</div>
          )}
        </div>

        <div className="table-scroll hidden md:block">
          <table className="data-table w-full min-w-[1160px] border-collapse text-left text-sm">
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
                  <td className="py-4 pr-4 font-semibold text-slate-950">{job.jobCode}</td>
                  <td className="py-4 pr-4 text-slate-700">{job.machine}</td>
                  <td className="py-4 pr-4 text-slate-700">{job.team}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.breakdownFrom)}</td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.breakdownTo)}</td>
                  <td className="wrap-cell py-4 pr-4 text-slate-700">{job.reason}</td>
                  <td className="table-actions py-4 pr-4">
                    <Badge tone={job.priority === "High" ? "danger" : job.priority === "Medium" ? "warning" : "neutral"}>
                      {job.priority}
                    </Badge>
                  </td>
                  <td className="table-actions py-4 pr-4">
                    <Badge tone={job.status === "Completed" ? "success" : job.status === "In Progress" ? "warning" : "neutral"}>
                      {job.status}
                    </Badge>
                  </td>
                  <td className="py-4 pr-4 text-slate-700">{formatDateTime(job.dueBy)}</td>
                  <td className="table-actions py-4 pr-4">
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
                        onClick={() => void handleDelete(job)}
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
                  className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
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
                  className="form-control h-11 rounded-xl border border-border bg-white px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
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

function withoutDeletedIds<T extends { id: number }>(items: T[], deletedIds: Set<number>): T[] {
  return items.filter((item) => !deletedIds.has(item.id));
}

const maintenanceExportColumns = [
  { label: "Job ID", value: (row: MaintenanceJob) => row.jobCode },
  { label: "Machine", value: (row: MaintenanceJob) => row.machine },
  { label: "Team", value: (row: MaintenanceJob) => row.team },
  { label: "Breakdown From", value: (row: MaintenanceJob) => formatDateTime(row.breakdownFrom) },
  { label: "Breakdown To", value: (row: MaintenanceJob) => formatDateTime(row.breakdownTo) },
  { label: "Reason", value: (row: MaintenanceJob) => row.reason },
  { label: "Priority", value: (row: MaintenanceJob) => row.priority },
  { label: "Status", value: (row: MaintenanceJob) => row.status },
  { label: "Due By", value: (row: MaintenanceJob) => formatDateTime(row.dueBy) },
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
        className="form-control h-11 rounded-xl border border-border px-3 outline-none focus:border-[#19C93B]/50 focus:ring-4 focus:ring-[#19C93B]/10"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required
        type={type}
        value={value}
      />
    </label>
  );
}
