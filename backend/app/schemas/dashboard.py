from datetime import datetime

from pydantic import BaseModel


class DashboardMetricPoint(BaseModel):
    value: int


class DashboardMetric(BaseModel):
    label: str
    value: int
    trend: str
    trend_direction: str
    sparkline: list[DashboardMetricPoint]


class DashboardInventorySlice(BaseModel):
    name: str
    value: float
    color: str


class DashboardMovementPoint(BaseModel):
    shift: str
    planned: int
    completed: int


class DashboardAlert(BaseModel):
    title: str
    description: str
    type: str
    time: str


class DashboardLowInventoryItem(BaseModel):
    item_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    status: str


class DashboardActiveTask(BaseModel):
    task_name: str
    line: str
    progress: int
    assigned_worker: str
    status: str


class DashboardRecentActivity(BaseModel):
    title: str
    description: str
    time: str
    type: str


class DashboardQualityOverview(BaseModel):
    rejection: int
    mr: int
    cr: int


class DashboardMaintenanceOverview(BaseModel):
    open: int
    high: int
    completed: int


class DashboardSummary(BaseModel):
    total_inventory: int
    total_in_quantity: int
    total_out_quantity: int
    total_rejections: int
    low_stock_count: int
    active_tasks: int
    delayed_tasks: int
    completed_tasks: int
    production_summary: dict[str, int]
    quality_overview: DashboardQualityOverview
    maintenance_overview: DashboardMaintenanceOverview
    kpi_metrics: list[DashboardMetric]
    inventory_categories: list[DashboardInventorySlice]
    movement_series: list[DashboardMovementPoint]
    alerts: list[DashboardAlert]
    low_stock_items: list[DashboardLowInventoryItem]
    active_tasks_table: list[DashboardActiveTask]
    recent_activities: list[DashboardRecentActivity]
    updated_at: datetime
