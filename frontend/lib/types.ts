export type Role = "admin" | "supervisor" | "worker";

export type InventoryItem = {
  id: number;
  product_name: string;
  sku_code: string;
  quantity: number;
  minimum_stock: number;
  location: string;
  created_at: string;
  updated_at: string;
  is_low_stock: boolean;
};

export type InventoryLog = {
  id: number;
  inventory_id: number | null;
  action_type: "created" | "updated" | "added" | "removed" | "deleted";
  quantity_changed: number;
  updated_by: number | null;
  timestamp: string;
};

export type TaskStatus = "pending" | "in_progress" | "delayed" | "completed";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type ProductionTask = {
  id: number;
  task_name: string;
  assigned_worker: string;
  status: TaskStatus;
  priority: TaskPriority;
  start_time: string | null;
  end_time: string | null;
  remarks: string | null;
  created_at: string;
};

export type Notification = {
  id: number;
  message: string;
  type: "low_stock" | "production_delay" | "task_update";
  is_read: boolean;
  created_at: string;
};

export type DashboardSummary = {
  total_inventory: number;
  low_stock_count: number;
  active_tasks: number;
  delayed_tasks: number;
  completed_tasks: number;
  production_summary: Record<TaskStatus, number>;
};

