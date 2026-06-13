export type Role = "admin" | "manager" | "supervisor" | "inventory" | "production" | "quality" | "maintenance" | "worker";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

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

export type InventoryEntry = {
  id: number;
  date: string;
  part_name: string;
  schedule_quantity: number;
  in_quantity: number;
  out_quantity: number;
  rejection_quantity: number;
  balance_quantity: number;
  remarks: string | null;
  created_by: string;
  created_at: string;
};

export type InventoryEntryPayload = {
  date: string;
  part_name: string;
  schedule_quantity: number;
  in_quantity: number;
  out_quantity: number;
  rejection_quantity: number;
  remarks?: string | null;
};

export type InventoryEntryListResponse = {
  items: InventoryEntry[];
  total: number;
};

export type InventoryLogListResponse = {
  items: InventoryEntry[];
  total: number;
  page: number;
  page_size: number;
};

export type InventoryBalancePreview = {
  part_name: string;
  previous_balance: number;
  projected_balance: number;
};

export type InventoryPartBalance = {
  part_name: string;
  balance_quantity: number;
  total_in_quantity: number;
  total_out_quantity: number;
  total_rejection_quantity: number;
  latest_entry_date: string;
  is_low_inventory: boolean;
};

export type InventoryMovementPoint = {
  label: string;
  in_quantity: number;
  out_quantity: number;
};

export type InventorySummary = {
  total_inventory: number;
  total_in_quantity: number;
  total_out_quantity: number;
  total_rejections: number;
  low_inventory_count: number;
  low_inventory_threshold: number;
  low_inventory_items: InventoryPartBalance[];
  part_balances: InventoryPartBalance[];
  movement_series: InventoryMovementPoint[];
  recent_entries: InventoryEntry[];
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

export type ProductionEntry = {
  id: number;
  date: string;
  shift: string;
  machine_number: string;
  operator_name: string;
  part_number: string;
  part_name: string;
  cycle_time_seconds: number;
  target_per_hour: number;
  daily_target: number;
  actual_production: number;
  efficiency_percent: number;
  remarks: string | null;
  created_by: string;
  created_at: string;
};

export type ProductionEntryPayload = {
  date: string;
  shift: string;
  machine_number: string;
  operator_name: string;
  part_number: string;
  part_name: string;
  cycle_time_seconds: number;
  target_per_hour: number;
  daily_target: number;
  actual_production: number;
  remarks?: string | null;
};

export type ProductionEntryListResponse = {
  items: ProductionEntry[];
  total: number;
};

export type MachineAnalyticsRow = {
  machine_number: string;
  daily_target: number;
  actual_production: number;
  efficiency_percent: number;
  is_underperforming: boolean;
};

export type ProductionChartPoint = {
  label: string;
  target: number;
  actual: number;
};

export type ProductionSummary = {
  total_daily_production: number;
  average_machine_efficiency: number;
  best_performing_machine: string | null;
  underperforming_machines: number;
  production_vs_target: ProductionChartPoint[];
  machine_wise_production: ProductionChartPoint[];
  recent_entries: ProductionEntry[];
};

export type Notification = {
  id: number;
  message: string;
  type: "low_stock" | "production_delay" | "task_update";
  is_read: boolean;
  created_at: string;
};

export type QualityRejection = {
  id: number;
  date: string;
  shift: "A" | "B" | "C";
  serialNumber: string;
  machineNumber: string;
  partName: string;
  rejectionQuantity: number;
  reason: string;
  cause: string;
  crMr: "CR" | "MR";
  jobWork: "Yes" | "No";
  remarks: string;
  timestamp: string;
};

export type QualityRejectionPayload = Omit<QualityRejection, "id" | "timestamp">;

export type QualityRejectionListResponse = {
  items: QualityRejection[];
  total: number;
};

export type GaugeInventory = {
  id: number;
  gaugeName: string;
  gaugeSpecification: string;
  gaugeType: string;
  gaugeQty: number;
  gaugeNo: string;
  wearAndTear: "Yes" | "No";
  gaugeCompany: string;
  createdBy: string;
  updatedAt: string;
};

export type GaugeInventoryPayload = Omit<GaugeInventory, "id" | "createdBy" | "updatedAt">;

export type GaugeInventoryListResponse = {
  items: GaugeInventory[];
  total: number;
};

export type GaugeStock = {
  id: number;
  gaugeStockQty: number;
  gaugeType: string;
  gaugePartName: string;
  createdBy: string;
  updatedAt: string;
};

export type GaugeStockPayload = Omit<GaugeStock, "id" | "createdBy" | "updatedAt">;

export type GaugeStockListResponse = {
  items: GaugeStock[];
  total: number;
};

export type CalibrationSheet = {
  id: number;
  serialNumber: string;
  equipmentName: string;
  make: string;
  equipmentNo: string;
  quantity: number;
  rangeSize: string;
  leastCount: string;
  frequencyCalibration: string;
  calibratedOn: string;
  calibrationDueOn: string;
  location: string;
  remark: string;
  createdBy: string;
  updatedAt: string;
};

export type CalibrationSheetPayload = Omit<CalibrationSheet, "id" | "createdBy" | "updatedAt">;

export type CalibrationSheetListResponse = {
  items: CalibrationSheet[];
  total: number;
};

export type GaugeHistoryCard = {
  id: number;
  description: string;
  controlNo: string;
  validationStandard: string;
  location: string;
  frequencyOfValidation: string;
  serialNumber: string;
  inspectionItem: string;
  specification: string;
  inspectionInstruments: string;
  remarks: string;
  validationDate: string;
  observationA: string;
  observationB: string;
  observationC: string;
  observationD: string;
  observationE: string;
  judgment: string;
  dueDate: string;
  rectificationDone: string;
  inspectionBy: string;
  hod: string;
  createdBy: string;
  updatedAt: string;
};

export type GaugeHistoryCardPayload = Omit<GaugeHistoryCard, "id" | "createdBy" | "updatedAt">;

export type GaugeHistoryCardListResponse = {
  items: GaugeHistoryCard[];
  total: number;
};

export type MaintenanceJob = {
  id: number;
  jobCode: string;
  machine: string;
  team: string;
  priority: "High" | "Medium" | "Low";
  status: "Pending" | "In Progress" | "Completed";
  breakdownFrom: string;
  breakdownTo: string;
  reason: string;
  dueBy: string;
};

export type MaintenanceJobPayload = Omit<MaintenanceJob, "id" | "jobCode">;

export type MaintenanceJobListResponse = {
  items: MaintenanceJob[];
  total: number;
};

export type DashboardSummary = {
  total_inventory: number;
  total_in_quantity: number;
  total_out_quantity: number;
  total_rejections: number;
  low_stock_count: number;
  active_tasks: number;
  delayed_tasks: number;
  completed_tasks: number;
  production_summary: Record<TaskStatus, number>;
  quality_overview: {
    rejection: number;
    mr: number;
    cr: number;
  };
  maintenance_overview: {
    open: number;
    high: number;
    completed: number;
  };
  kpi_metrics: Array<{
    label: string;
    value: number;
    trend: string;
    trend_direction: "up" | "down";
    sparkline: Array<{ value: number }>;
  }>;
  inventory_categories: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  movement_series: Array<{
    shift: string;
    planned: number;
    completed: number;
  }>;
  alerts: Array<{
    title: string;
    description: string;
    type: "low_stock" | "delay" | "maintenance";
    time: string;
  }>;
  low_stock_items: Array<{
    item_name: string;
    sku: string;
    current_stock: number;
    minimum_stock: number;
    status: "Low" | "Warning" | "Critical";
  }>;
  active_tasks_table: Array<{
    task_name: string;
    line: string;
    progress: number;
    assigned_worker: string;
    status: "Running" | "Delayed" | "Queued" | "Review";
  }>;
  recent_activities: Array<{
    title: string;
    description: string;
    time: string;
    type: "inventory" | "production" | "alert" | "task";
  }>;
  updated_at: string;
};
