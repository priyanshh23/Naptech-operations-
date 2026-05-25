from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_inventory: int
    low_stock_count: int
    active_tasks: int
    delayed_tasks: int
    completed_tasks: int
    production_summary: dict[str, int]

