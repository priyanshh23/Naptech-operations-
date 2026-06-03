from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InventoryEntryBase(BaseModel):
    date: date_type
    part_name: str = Field(min_length=1, max_length=180)
    schedule_quantity: int = Field(default=0, ge=0)
    in_quantity: int = Field(default=0, ge=0)
    out_quantity: int = Field(default=0, ge=0)
    rejection_quantity: int = Field(default=0, ge=0)
    remarks: Optional[str] = Field(default=None, max_length=500)


class InventoryEntryCreate(InventoryEntryBase):
    pass


class InventoryEntryUpdate(BaseModel):
    date: Optional[date_type] = None
    part_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    schedule_quantity: Optional[int] = Field(default=None, ge=0)
    in_quantity: Optional[int] = Field(default=None, ge=0)
    out_quantity: Optional[int] = Field(default=None, ge=0)
    rejection_quantity: Optional[int] = Field(default=None, ge=0)
    remarks: Optional[str] = Field(default=None, max_length=500)


class InventoryEntryResponse(InventoryEntryBase):
    id: int
    balance_quantity: int
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}


class InventoryEntryListResponse(BaseModel):
    items: list[InventoryEntryResponse]
    total: int


class InventoryLogListResponse(BaseModel):
    items: list[InventoryEntryResponse]
    total: int
    page: int
    page_size: int


class InventoryBalancePreview(BaseModel):
    part_name: str
    previous_balance: int
    projected_balance: int


class InventoryPartBalance(BaseModel):
    part_name: str
    balance_quantity: int
    total_in_quantity: int
    total_out_quantity: int
    total_rejection_quantity: int
    latest_entry_date: date_type
    is_low_inventory: bool


class InventoryMovementPoint(BaseModel):
    label: str
    in_quantity: int
    out_quantity: int


class InventorySummaryResponse(BaseModel):
    total_inventory: int
    total_in_quantity: int
    total_out_quantity: int
    total_rejections: int
    low_inventory_count: int
    low_inventory_threshold: int
    low_inventory_items: list[InventoryPartBalance]
    part_balances: list[InventoryPartBalance]
    movement_series: list[InventoryMovementPoint]
    recent_entries: list[InventoryEntryResponse]
