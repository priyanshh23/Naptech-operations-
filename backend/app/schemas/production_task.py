from datetime import datetime

from pydantic import BaseModel, Field

from app.models.production_task import TaskPriority, TaskStatus


class ProductionTaskBase(BaseModel):
    task_name: str = Field(min_length=1, max_length=180)
    assigned_worker: str = Field(min_length=1, max_length=120)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    start_time: datetime | None = None
    end_time: datetime | None = None
    remarks: str | None = None


class ProductionTaskCreate(ProductionTaskBase):
    pass


class ProductionTaskUpdate(BaseModel):
    task_name: str | None = Field(default=None, min_length=1, max_length=180)
    assigned_worker: str | None = Field(default=None, min_length=1, max_length=120)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    remarks: str | None = None


class ProductionTaskResponse(ProductionTaskBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

