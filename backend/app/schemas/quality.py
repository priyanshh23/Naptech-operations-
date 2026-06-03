from datetime import date as date_type
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class QualityRejectionBase(BaseModel):
    date: date_type
    shift: str = Field(min_length=1, max_length=20)
    serial_number: str = Field(min_length=1, max_length=40)
    machine_number: str = Field(min_length=1, max_length=80)
    part_name: str = Field(min_length=1, max_length=180)
    rejection_quantity: int = Field(default=0, ge=0)
    reason: str = Field(min_length=1, max_length=255)
    cause: str = Field(min_length=1, max_length=255)
    cr_mr: str = Field(min_length=2, max_length=10)
    remarks: Optional[str] = Field(default=None, max_length=500)


class QualityRejectionCreate(QualityRejectionBase):
    pass


class QualityRejectionUpdate(BaseModel):
    date: Optional[date_type] = None
    shift: Optional[str] = Field(default=None, min_length=1, max_length=20)
    serial_number: Optional[str] = Field(default=None, min_length=1, max_length=40)
    machine_number: Optional[str] = Field(default=None, min_length=1, max_length=80)
    part_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    rejection_quantity: Optional[int] = Field(default=None, ge=0)
    reason: Optional[str] = Field(default=None, min_length=1, max_length=255)
    cause: Optional[str] = Field(default=None, min_length=1, max_length=255)
    cr_mr: Optional[str] = Field(default=None, min_length=2, max_length=10)
    remarks: Optional[str] = Field(default=None, max_length=500)


class QualityRejectionResponse(QualityRejectionBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class QualityRejectionListResponse(BaseModel):
    items: list[QualityRejectionResponse]
    total: int
