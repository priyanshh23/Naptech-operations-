import type { LucideIcon } from "lucide-react";

export type TrendDirection = "up" | "down";

export type KpiMetric = {
  label: string;
  value: string;
  trend: string;
  trendDirection: TrendDirection;
  icon: LucideIcon;
  sparkline: Array<{ value: number }>;
};

export type InventoryCategory = {
  name: string;
  value: number;
  color: string;
};

export type ProductionPoint = {
  shift: string;
  planned: number;
  completed: number;
};

export type AlertItem = {
  title: string;
  description: string;
  type: "low_stock" | "delay" | "maintenance";
  time: string;
};

export type LowStockItem = {
  itemName: string;
  sku: string;
  currentStock: number;
  minimumStock: number;
  status: "Low" | "Warning" | "Critical";
};

export type ActiveProductionTask = {
  taskName: string;
  line: string;
  progress: number;
  assignedWorker: string;
  status: "Running" | "Delayed" | "Queued" | "Review";
};

export type RecentActivity = {
  title: string;
  description: string;
  time: string;
  type: "inventory" | "production" | "alert" | "task";
};

