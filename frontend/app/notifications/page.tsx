import { AlertTriangle, Bell, CheckCircle2, ClipboardList } from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { Badge, Card, PageHeader } from "@/components/ui";
import { getNotifications } from "@/lib/api";
import { formatDateTime, titleCase } from "@/lib/format";
import type { Notification } from "@/lib/types";

const icons: Record<Notification["type"], ReactNode> = {
  low_stock: <AlertTriangle size={20} />,
  production_delay: <ClipboardList size={20} />,
  task_update: <CheckCircle2 size={20} />,
};

const tones: Record<Notification["type"], "warning" | "danger" | "info"> = {
  low_stock: "warning",
  production_delay: "danger",
  task_update: "info",
};

export default async function NotificationsPage() {
  const notifications = await getNotifications();

  return (
    <AppShell>
      <PageHeader
        description="Operational alerts for low stock, production delays, and task status changes."
        title="Notifications"
      />

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <Bell size={18} className="text-cyan-700" />
          <h2 className="text-base font-semibold text-slate-950">Alerts Panel</h2>
        </div>
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between"
              key={notification.id}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
                  {icons[notification.type]}
                </div>
                <div>
                  <p className="font-medium text-slate-950">{notification.message}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(notification.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={tones[notification.type]}>{titleCase(notification.type)}</Badge>
                <Badge tone={notification.is_read ? "neutral" : "success"}>
                  {notification.is_read ? "Read" : "New"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
