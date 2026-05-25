from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.production_task import TaskPriority, TaskStatus


class ProductionTaskBase(BaseModel):
    task_name: str = Field(min_length=1, max_length=180)
    assigned_worker: str = Field(min_length=1, max_length=120)
    status: TaskStatus = TaskStatus.PENDING
    priority: TaskPriority = TaskPriority.MEDIUM
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remarks: Optional[str] = None


class ProductionTaskCreate(ProductionTaskBase):
    pass


class ProductionTaskUpdate(BaseModel):
    task_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    assigned_worker: Optional[str] = Field(default=None, min_length=1, max_length=120)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remarks: Optional[str] = None


class ProductionTaskResponse(ProductionTaskBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}
