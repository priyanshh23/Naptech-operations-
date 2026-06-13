from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.inventory_entry import InventoryEntry
from app.models.maintenance_job import MaintenanceJob
from app.models.notification import Notification, NotificationType
from app.models.production_entry import ProductionEntry
from app.models.production_task import ProductionTask, TaskStatus
from app.models.quality_rejection import QualityRejection
from app.schemas.dashboard import (
    DashboardActiveTask,
    DashboardAlert,
    DashboardInventorySlice,
    DashboardLowInventoryItem,
    DashboardMetric,
    DashboardMetricPoint,
    DashboardMovementPoint,
    DashboardMaintenanceOverview,
    DashboardQualityOverview,
    DashboardRecentActivity,
    DashboardSummary,
)
from app.services.inventory_service import get_inventory_summary
from app.services.production_service import get_machine_analytics
from app.utils.config import settings

INVENTORY_COLORS = ["#19C93B", "#A3FF12", "#2563EB", "#F59E0B", "#AAB2C0"]


def _humanize_time(created_at: datetime) -> str:
    delta = datetime.now(timezone.utc).replace(tzinfo=None) - created_at
    minutes = int(delta.total_seconds() // 60)
    if minutes < 60:
        return f"{max(minutes, 0)}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    return created_at.strftime("%d %b")


def _date_filtered(statement, column, date_from: Optional[date], date_to: Optional[date]):
    if date_from:
        statement = statement.where(func.date(column) >= date_from)
    if date_to:
        statement = statement.where(func.date(column) <= date_to)
    return statement


def _task_counts_by_status(db: Session, date_from: Optional[date], date_to: Optional[date]) -> dict[TaskStatus, int]:
    statement = select(ProductionTask.status, func.count()).group_by(ProductionTask.status)
    if date_from:
        statement = statement.where(func.date(ProductionTask.created_at) >= date_from)
    if date_to:
        statement = statement.where(func.date(ProductionTask.created_at) <= date_to)

    counts: dict[TaskStatus, int] = {status: 0 for status in TaskStatus}
    for status_value, count in db.execute(statement).all():
        try:
            status = status_value if isinstance(status_value, TaskStatus) else TaskStatus(status_value)
        except ValueError:
            continue
        counts[status] = int(count)
    return counts


def get_dashboard_summary(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> DashboardSummary:
    inventory_summary = get_inventory_summary(db, date_from, date_to)

    task_counts = _task_counts_by_status(db, date_from, date_to)
    active_tasks = task_counts[TaskStatus.IN_PROGRESS]
    delayed_tasks = task_counts[TaskStatus.DELAYED]
    completed_tasks = task_counts[TaskStatus.COMPLETED]
    production_summary = {status.value: task_counts[status] for status in TaskStatus}

    latest_part_balances = inventory_summary.part_balances[:5]
    total_inventory = max(inventory_summary.total_inventory, 1)
    inventory_categories = [
        DashboardInventorySlice(
            name=item.part_name,
            value=round((item.balance_quantity / total_inventory) * 100, 1),
            color=INVENTORY_COLORS[index % len(INVENTORY_COLORS)],
        )
        for index, item in enumerate(latest_part_balances)
    ]

    movement_series = [
        DashboardMovementPoint(
            shift=point.label,
            planned=point.in_quantity,
            completed=point.out_quantity,
        )
        for point in inventory_summary.movement_series
    ]

    kpi_metrics = [
        DashboardMetric(
            label="Total Inventory",
            value=inventory_summary.total_inventory,
            trend="Live balance",
            trend_direction="up",
            sparkline=[DashboardMetricPoint(value=max(point.completed, 0)) for point in movement_series[-6:]] or [DashboardMetricPoint(value=0)],
        ),
        DashboardMetric(
            label="Total IN Quantity",
            value=inventory_summary.total_in_quantity,
            trend="Material received",
            trend_direction="up",
            sparkline=[DashboardMetricPoint(value=max(point.planned, 0)) for point in movement_series[-6:]] or [DashboardMetricPoint(value=0)],
        ),
        DashboardMetric(
            label="Total OUT Quantity",
            value=inventory_summary.total_out_quantity,
            trend="Material issued",
            trend_direction="up",
            sparkline=[DashboardMetricPoint(value=max(point.completed, 0)) for point in movement_series[-6:]] or [DashboardMetricPoint(value=0)],
        ),
        DashboardMetric(
            label="Low Stock Items",
            value=inventory_summary.low_inventory_count,
            trend=f"Threshold < {settings.inventory_low_threshold}",
            trend_direction="down",
            sparkline=[
                DashboardMetricPoint(value=item.balance_quantity)
                for item in inventory_summary.low_inventory_items[:6]
            ]
            or [DashboardMetricPoint(value=0)],
        ),
    ]

    notifications = list(db.scalars(select(Notification).order_by(Notification.created_at.desc()).limit(4)).all())
    alerts = [
        DashboardAlert(
            title=notification.message,
            description="System generated alert",
            type="low_stock" if notification.type == NotificationType.LOW_STOCK else "delay",
            time=_humanize_time(notification.created_at),
        )
        for notification in notifications
    ]

    for machine in get_machine_analytics(db, date_from, date_to):
        if len(alerts) >= 4:
            break
        if machine.is_underperforming:
            alerts.append(
                DashboardAlert(
                    title=f"Production below target: {machine.machine_number}",
                    description=f"Actual {machine.actual_production} / Target {machine.daily_target} ({machine.efficiency_percent}%)",
                    type="delay",
                    time="Live",
                )
            )

    for item in inventory_summary.low_inventory_items[: max(0, 4 - len(alerts))]:
        alerts.append(
            DashboardAlert(
                title=f"Low inventory: {item.part_name}",
                description=f"Balance {item.balance_quantity} | Threshold {settings.inventory_low_threshold}",
                type="low_stock",
                time=item.latest_entry_date.strftime("%d %b"),
            )
        )

    active_task_statement = select(ProductionTask).where(
        ProductionTask.status.in_([TaskStatus.IN_PROGRESS, TaskStatus.DELAYED, TaskStatus.PENDING])
    )
    if date_from:
        active_task_statement = active_task_statement.where(func.date(ProductionTask.created_at) >= date_from)
    if date_to:
        active_task_statement = active_task_statement.where(func.date(ProductionTask.created_at) <= date_to)

    active_task_rows = list(
        db.scalars(active_task_statement.order_by(ProductionTask.created_at.desc()).limit(5)).all()
    )
    active_tasks_table = [
        DashboardActiveTask(
            task_name=task.task_name,
            line=task.remarks or "Production line",
            progress=100 if task.status == TaskStatus.COMPLETED else 65 if task.status == TaskStatus.IN_PROGRESS else 30,
            assigned_worker=task.assigned_worker,
            status="Delayed" if task.status == TaskStatus.DELAYED else "Running" if task.status == TaskStatus.IN_PROGRESS else "Queued",
        )
        for task in active_task_rows
    ]

    low_stock_items = [
        DashboardLowInventoryItem(
            item_name=item.part_name,
            sku=item.part_name[:3].upper() + f"-{index + 1:03d}",
            current_stock=item.balance_quantity,
            minimum_stock=settings.inventory_low_threshold,
            status="Critical" if item.balance_quantity <= settings.inventory_low_threshold // 2 else "Low",
        )
        for index, item in enumerate(inventory_summary.low_inventory_items[:5])
    ]

    recent_activities = [
        DashboardRecentActivity(
            title=f"Inventory entry: {entry.part_name}",
            description=f"IN {entry.in_quantity} | OUT {entry.out_quantity} | Balance {entry.balance_quantity}",
            time=entry.date.strftime("%d %b"),
            type="inventory",
        )
        for entry in inventory_summary.recent_entries[:3]
    ]
    recent_activities.extend(
        DashboardRecentActivity(
            title="Production task updated",
            description=task.task_name,
            time=task.created_at.strftime("%d %b"),
            type="task",
        )
        for task in active_task_rows[:2]
    )

    production_entries = list(
        db.scalars(select(ProductionEntry).order_by(ProductionEntry.created_at.desc()).limit(2)).all()
    )
    recent_activities.extend(
        DashboardRecentActivity(
            title=f"Production entry: {entry.machine_number}",
            description=f"{entry.part_name} | Actual {entry.actual_production} / Target {entry.daily_target}",
            time=_humanize_time(entry.created_at),
            type="production",
        )
        for entry in production_entries
    )

    return DashboardSummary(
        total_inventory=inventory_summary.total_inventory,
        total_in_quantity=inventory_summary.total_in_quantity,
        total_out_quantity=inventory_summary.total_out_quantity,
        total_rejections=inventory_summary.total_rejections,
        low_stock_count=inventory_summary.low_inventory_count,
        active_tasks=int(active_tasks),
        delayed_tasks=int(delayed_tasks),
        completed_tasks=int(completed_tasks),
        production_summary=production_summary,
        quality_overview=quality_overview,
        maintenance_overview=maintenance_overview,
        kpi_metrics=kpi_metrics,
        inventory_categories=inventory_categories,
        movement_series=movement_series,
        alerts=alerts[:4],
        low_stock_items=low_stock_items,
        active_tasks_table=active_tasks_table,
        recent_activities=recent_activities[:6],
        updated_at=datetime.utcnow(),
    )
