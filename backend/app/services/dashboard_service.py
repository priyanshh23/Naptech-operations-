from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.inventory import Inventory
from app.models.production_task import ProductionTask, TaskStatus
from app.schemas.dashboard import DashboardSummary


def get_dashboard_summary(db: Session) -> DashboardSummary:
    total_inventory = db.scalar(select(func.coalesce(func.sum(Inventory.quantity), 0))) or 0
    low_stock_count = db.scalar(
        select(func.count()).select_from(Inventory).where(Inventory.quantity <= Inventory.minimum_stock)
    ) or 0
    active_tasks = db.scalar(
        select(func.count()).select_from(ProductionTask).where(ProductionTask.status == TaskStatus.IN_PROGRESS)
    ) or 0
    delayed_tasks = db.scalar(
        select(func.count()).select_from(ProductionTask).where(ProductionTask.status == TaskStatus.DELAYED)
    ) or 0
    completed_tasks = db.scalar(
        select(func.count()).select_from(ProductionTask).where(ProductionTask.status == TaskStatus.COMPLETED)
    ) or 0

    production_summary = {
        status.value: db.scalar(
            select(func.count()).select_from(ProductionTask).where(ProductionTask.status == status)
        )
        or 0
        for status in TaskStatus
    }

    return DashboardSummary(
        total_inventory=total_inventory,
        low_stock_count=low_stock_count,
        active_tasks=active_tasks,
        delayed_tasks=delayed_tasks,
        completed_tasks=completed_tasks,
        production_summary=production_summary,
    )

