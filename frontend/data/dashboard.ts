import { Activity, AlertTriangle, Boxes, CheckCircle2 } from "lucide-react";

import type {
  ActiveProductionTask,
  AlertItem,
  InventoryCategory,
  KpiMetric,
  LowStockItem,
  ProductionPoint,
  RecentActivity,
} from "@/types/dashboard";

export const kpiMetrics: KpiMetric[] = [
  {
    label: "Total Inventory Value",
    value: "₹48.6L",
    trend: "+12.4%",
    trendDirection: "up",
    icon: Boxes,
    sparkline: [{ value: 28 }, { value: 34 }, { value: 31 }, { value: 42 }, { value: 47 }, { value: 54 }],
  },
  {
    label: "Low Stock Items",
    value: "18",
    trend: "-6 from yesterday",
    trendDirection: "down",
    icon: AlertTriangle,
    sparkline: [{ value: 42 }, { value: 38 }, { value: 34 }, { value: 27 }, { value: 22 }, { value: 18 }],
  },
  {
    label: "Active Production",
    value: "42",
    trend: "+8.1%",
    trendDirection: "up",
    icon: Activity,
    sparkline: [{ value: 22 }, { value: 25 }, { value: 31 }, { value: 35 }, { value: 39 }, { value: 42 }],
  },
  {
    label: "Completed Today",
    value: "316",
    trend: "+24 units",
    trendDirection: "up",
    icon: CheckCircle2,
    sparkline: [{ value: 120 }, { value: 168 }, { value: 206 }, { value: 244 }, { value: 281 }, { value: 316 }],
  },
];

export const inventoryCategories: InventoryCategory[] = [
  { name: "Raw Materials", value: 34, color: "#19C93B" },
  { name: "Components", value: 28, color: "#8BFF4D" },
  { name: "Sub-Assemblies", value: 22, color: "#22C55E" },
  { name: "Finished Goods", value: 16, color: "#064E3B" },
];

export const productionSeries: ProductionPoint[] = [
  { shift: "06:00", planned: 80, completed: 64 },
  { shift: "08:00", planned: 140, completed: 132 },
  { shift: "10:00", planned: 210, completed: 196 },
  { shift: "12:00", planned: 280, completed: 252 },
  { shift: "14:00", planned: 350, completed: 318 },
  { shift: "16:00", planned: 420, completed: 388 },
];

export const alerts: AlertItem[] = [
  {
    title: "Critical stock: Fastener Kit",
    description: "6 units remaining against minimum 25.",
    type: "low_stock",
    time: "8 min ago",
  },
  {
    title: "Line 2 output delay",
    description: "Gear housing inspection is 34 minutes behind plan.",
    type: "delay",
    time: "18 min ago",
  },
  {
    title: "Preventive maintenance due",
    description: "CNC-M4 lubrication checklist pending.",
    type: "maintenance",
    time: "42 min ago",
  },
];

export const lowStockItems: LowStockItem[] = [
  { itemName: "Fastener Kit", sku: "FST-KIT-080", currentStock: 6, minimumStock: 25, status: "Critical" },
  { itemName: "Clutch Cable", sku: "CLT-CAB-021", currentStock: 9, minimumStock: 15, status: "Low" },
  { itemName: "Brake Pad Shim", sku: "BRK-SHM-044", currentStock: 18, minimumStock: 24, status: "Warning" },
  { itemName: "Sensor Bracket", sku: "SNS-BKT-119", currentStock: 12, minimumStock: 30, status: "Critical" },
];

export const activeTasks: ActiveProductionTask[] = [
  { taskName: "Brake sub-unit assembly", line: "Line 01", progress: 72, assignedWorker: "Ravi Kumar", status: "Running" },
  { taskName: "Gear housing inspection", line: "Line 02", progress: 44, assignedWorker: "Neha Singh", status: "Delayed" },
  { taskName: "Clutch cable packing", line: "Line 03", progress: 88, assignedWorker: "Aman Verma", status: "Review" },
  { taskName: "Fastener bin preparation", line: "Stores", progress: 26, assignedWorker: "Iqbal Khan", status: "Queued" },
];

export const recentActivities: RecentActivity[] = [
  {
    title: "Inventory added",
    description: "12 Brake Pad Sets added to Rack A1.",
    time: "09:32",
    type: "inventory",
  },
  {
    title: "Production completed",
    description: "Clutch cable kit packing finished for dispatch.",
    time: "10:12",
    type: "production",
  },
  {
    title: "Low stock alert",
    description: "Sensor Bracket moved to critical level.",
    time: "10:44",
    type: "alert",
  },
  {
    title: "Task update",
    description: "Line 1 assembly crossed 70% progress.",
    time: "11:05",
    type: "task",
  },
];

export const outputProgress = {
  percentage: 76,
  target: 420,
  achieved: 318,
  remaining: 102,
};

