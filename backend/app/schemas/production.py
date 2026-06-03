from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ProductionEntryBase(BaseModel):
    date: date_type
    shift: str = Field(min_length=1, max_length=20)
    machine_number: str = Field(min_length=1, max_length=80)
    operator_name: str = Field(min_length=1, max_length=120)
    part_number: str = Field(min_length=1, max_length=100)
    part_name: str = Field(min_length=1, max_length=180)
    cycle_time_seconds: int = Field(default=0, ge=0)
    target_per_hour: int = Field(default=0, ge=0)
    daily_target: int = Field(default=0, ge=0)
    actual_production: int = Field(default=0, ge=0)
    remarks: Optional[str] = Field(default=None, max_length=500)


class ProductionEntryCreate(ProductionEntryBase):
    pass


class ProductionEntryUpdate(BaseModel):
    date: Optional[date_type] = None
    shift: Optional[str] = Field(default=None, min_length=1, max_length=20)
    machine_number: Optional[str] = Field(default=None, min_length=1, max_length=80)
    operator_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    part_number: Optional[str] = Field(default=None, min_length=1, max_length=100)
    part_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    cycle_time_seconds: Optional[int] = Field(default=None, ge=0)
    target_per_hour: Optional[int] = Field(default=None, ge=0)
    daily_target: Optional[int] = Field(default=None, ge=0)
    actual_production: Optional[int] = Field(default=None, ge=0)
    remarks: Optional[str] = Field(default=None, max_length=500)


class ProductionEntryResponse(ProductionEntryBase):
    id: int
    efficiency_percent: float
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProductionEntryListResponse(BaseModel):
    items: list[ProductionEntryResponse]
    total: int


class MachineAnalyticsRow(BaseModel):
    machine_number: str
    daily_target: int
    actual_production: int
    efficiency_percent: float
    is_underperforming: bool


class ProductionChartPoint(BaseModel):
    label: str
    target: int
    actual: int


class ProductionSummaryResponse(BaseModel):
    total_daily_production: int
    average_machine_efficiency: float
    best_performing_machine: Optional[str]
    underperforming_machines: int
    production_vs_target: list[ProductionChartPoint]
    machine_wise_production: list[ProductionChartPoint]
    recent_entries: list[ProductionEntryResponse]
