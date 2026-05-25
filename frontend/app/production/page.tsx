"use client";

import { ClipboardPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { productionTasks as initialTasks } from "@/lib/mock-data";
import { formatDateTime, titleCase } from "@/lib/format";
import type { ProductionTask, TaskStatus } from "@/lib/types";

const columns: Array<{ status: TaskStatus; label: string }> = [
  { status: "pending", label: "Pending" },
  { status: "in_progress", label: "In Progress" },
  { status: "delayed", label: "Delayed" },
  { status: "completed", label: "Completed" },
];

export default function ProductionPage() {
  const [tasks, setTasks] = useState<ProductionTask[]>(initialTasks);
  const [showForm, setShowForm] = useState(false);

  const groupedTasks = useMemo(
    () =>
      columns.map((column) => ({
        ...column,
        tasks: tasks.filter((task) => task.status === column.status),
      })),
    [tasks],
  );

  function createTask(formData: FormData) {
    const task: ProductionTask = {
      id: Date.now(),
      task_name: String(formData.get("task_name")),
      assigned_worker: String(formData.get("assigned_worker")),
      status: String(formData.get("status")) as TaskStatus,
      priority: String(formData.get("priority")) as ProductionTask["priority"],
      start_time: null,
      end_time: null,
      remarks: String(formData.get("remarks")),
      created_at: new Date().toISOString(),
    };
    setTasks((current) => [task, ...current]);
    setShowForm(false);
  }

  function updateStatus(id: number, status: TaskStatus) {
    setTasks((current) =>
      current.map((task) =>
        task.id === id
          ? {
              ...task,
              status,
              end_time: status === "completed" ? new Date().toISOString() : task.end_time,
            }
          : task,
      ),
    );
  }

  return (
    <AppShell>
      <PageHeader
        action={
          <Button onClick={() => setShowForm(true)}>
            <ClipboardPlus size={18} />
            Create Task
          </Button>
        }
        description="Track worker assignments, production status, delays, and completed task logs."
        title="Production"
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {groupedTasks.map((column) => (
          <Card className="min-h-[420px]" key={column.status}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-950">{column.label}</h2>
              <Badge tone={column.status === "delayed" ? "danger" : "neutral"}>{column.tasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {column.tasks.map((task) => (
                <div className="rounded-md border border-border p-4" key={task.id}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{task.task_name}</p>
                      <p className="text-sm text-muted-foreground">{task.assigned_worker}</p>
                    </div>
                    <Badge tone={task.priority === "urgent" ? "danger" : "warning"}>{titleCase(task.priority)}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">{task.remarks}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Created {formatDateTime(task.created_at)}</p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-slate-700"
                      onClick={() => updateStatus(task.id, "in_progress")}
                      type="button"
                    >
                      Start
                    </button>
                    <button
                      className="rounded-md border border-border px-3 py-2 text-xs font-semibold text-red-700"
                      onClick={() => updateStatus(task.id, "delayed")}
                      type="button"
                    >
                      Delay
                    </button>
                    <button
                      className="col-span-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"
                      onClick={() => updateStatus(task.id, "completed")}
                      type="button"
                    >
                      Complete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4">
          <Card className="w-full max-w-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">Create Production Task</h2>
              <p className="text-sm text-muted-foreground">Assign work to a worker and track it through the board.</p>
            </div>
            <form action={createTask} className="grid gap-4 md:grid-cols-2">
              <Field label="Task Name" name="task_name" />
              <Field label="Assigned Worker" name="assigned_worker" />
              <Select
                label="Status"
                name="status"
                options={[
                  ["pending", "Pending"],
                  ["in_progress", "In Progress"],
                ]}
              />
              <Select
                label="Priority"
                name="priority"
                options={[
                  ["medium", "Medium"],
                  ["high", "High"],
                  ["urgent", "Urgent"],
                ]}
              />
              <label className="block md:col-span-2">
                <span className="mb-2 block text-sm font-medium text-slate-800">Remarks</span>
                <textarea className="min-h-24 w-full rounded-md border border-border p-3 outline-none" name="remarks" />
              </label>
              <div className="flex items-end gap-3 md:col-span-2">
                <Button type="submit">Create Task</Button>
                <button
                  className="h-10 rounded-md border border-border px-4 text-sm font-semibold text-slate-700"
                  onClick={() => setShowForm(false)}
                  type="button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        </div>
      ) : null}
    </AppShell>
  );
}

function Field({ label, name }: Readonly<{ label: string; name: string }>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <input className="h-11 w-full rounded-md border border-border px-3 outline-none" name={name} required />
    </label>
  );
}

function Select({
  label,
  name,
  options,
}: Readonly<{
  label: string;
  name: string;
  options: Array<[string, string]>;
}>) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-800">{label}</span>
      <select className="h-11 w-full rounded-md border border-border px-3 outline-none" name={name}>
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

