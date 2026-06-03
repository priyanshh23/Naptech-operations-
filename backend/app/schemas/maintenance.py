from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class MaintenanceJobBase(BaseModel):
    machine: str = Field(min_length=1, max_length=100)
    team: str = Field(min_length=1, max_length=120)
    priority: str = Field(min_length=1, max_length=20)
    status: str = Field(min_length=1, max_length=40)
    breakdown_from: datetime
    breakdown_to: datetime
    reason: str = Field(min_length=1, max_length=500)
    due_by: datetime


class MaintenanceJobCreate(MaintenanceJobBase):
    pass


class MaintenanceJobUpdate(BaseModel):
    machine: Optional[str] = Field(default=None, min_length=1, max_length=100)
    team: Optional[str] = Field(default=None, min_length=1, max_length=120)
    priority: Optional[str] = Field(default=None, min_length=1, max_length=20)
    status: Optional[str] = Field(default=None, min_length=1, max_length=40)
    breakdown_from: Optional[datetime] = None
    breakdown_to: Optional[datetime] = None
    reason: Optional[str] = Field(default=None, min_length=1, max_length=500)
    due_by: Optional[datetime] = None


class MaintenanceJobResponse(MaintenanceJobBase):
    id: int
    job_code: str
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class MaintenanceJobListResponse(BaseModel):
    items: list[MaintenanceJobResponse]
    total: int
