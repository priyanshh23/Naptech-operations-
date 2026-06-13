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
    job_work: str = Field(default="No", pattern="^(Yes|No)$")
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
    job_work: Optional[str] = Field(default=None, pattern="^(Yes|No)$")
    remarks: Optional[str] = Field(default=None, max_length=500)


class QualityRejectionResponse(QualityRejectionBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class QualityRejectionListResponse(BaseModel):
    items: list[QualityRejectionResponse]
    total: int


class GaugeInventoryBase(BaseModel):
    gauge_name: str = Field(min_length=1, max_length=180)
    gauge_specification: str = Field(min_length=1, max_length=255)
    gauge_type: str = Field(min_length=1, max_length=120)
    gauge_qty: int = Field(default=0, ge=0)
    gauge_no: str = Field(min_length=1, max_length=120)
    wear_and_tear: str = Field(default="No", pattern="^(Yes|No)$")
    gauge_company: str = Field(min_length=1, max_length=180)


class GaugeInventoryCreate(GaugeInventoryBase):
    pass


class GaugeInventoryUpdate(BaseModel):
    gauge_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    gauge_specification: Optional[str] = Field(default=None, min_length=1, max_length=255)
    gauge_type: Optional[str] = Field(default=None, min_length=1, max_length=120)
    gauge_qty: Optional[int] = Field(default=None, ge=0)
    gauge_no: Optional[str] = Field(default=None, min_length=1, max_length=120)
    wear_and_tear: Optional[str] = Field(default=None, pattern="^(Yes|No)$")
    gauge_company: Optional[str] = Field(default=None, min_length=1, max_length=180)


class GaugeInventoryResponse(GaugeInventoryBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class GaugeInventoryListResponse(BaseModel):
    items: list[GaugeInventoryResponse]
    total: int


class GaugeStockBase(BaseModel):
    gauge_stock_qty: int = Field(default=0, ge=0)
    gauge_type: str = Field(min_length=1, max_length=120)
    gauge_part_name: str = Field(min_length=1, max_length=180)


class GaugeStockCreate(GaugeStockBase):
    pass


class GaugeStockUpdate(BaseModel):
    gauge_stock_qty: Optional[int] = Field(default=None, ge=0)
    gauge_type: Optional[str] = Field(default=None, min_length=1, max_length=120)
    gauge_part_name: Optional[str] = Field(default=None, min_length=1, max_length=180)


class GaugeStockResponse(GaugeStockBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class GaugeStockListResponse(BaseModel):
    items: list[GaugeStockResponse]
    total: int


class CalibrationSheetBase(BaseModel):
    serial_number: str = Field(min_length=1, max_length=40)
    equipment_name: str = Field(min_length=1, max_length=180)
    make: str = Field(min_length=1, max_length=120)
    equipment_no: str = Field(min_length=1, max_length=120)
    quantity: int = Field(default=0, ge=0)
    range_size: str = Field(min_length=1, max_length=180)
    least_count: str = Field(min_length=1, max_length=80)
    frequency_calibration: str = Field(min_length=1, max_length=120)
    calibrated_on: str = Field(min_length=1, max_length=80)
    calibration_due_on: str = Field(min_length=1, max_length=80)
    location: str = Field(min_length=1, max_length=180)
    remark: Optional[str] = Field(default="", max_length=500)


class CalibrationSheetCreate(CalibrationSheetBase):
    pass


class CalibrationSheetUpdate(BaseModel):
    serial_number: Optional[str] = Field(default=None, min_length=1, max_length=40)
    equipment_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    make: Optional[str] = Field(default=None, min_length=1, max_length=120)
    equipment_no: Optional[str] = Field(default=None, min_length=1, max_length=120)
    quantity: Optional[int] = Field(default=None, ge=0)
    range_size: Optional[str] = Field(default=None, min_length=1, max_length=180)
    least_count: Optional[str] = Field(default=None, min_length=1, max_length=80)
    frequency_calibration: Optional[str] = Field(default=None, min_length=1, max_length=120)
    calibrated_on: Optional[str] = Field(default=None, min_length=1, max_length=80)
    calibration_due_on: Optional[str] = Field(default=None, min_length=1, max_length=80)
    location: Optional[str] = Field(default=None, min_length=1, max_length=180)
    remark: Optional[str] = Field(default=None, max_length=500)


class CalibrationSheetResponse(CalibrationSheetBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class CalibrationSheetListResponse(BaseModel):
    items: list[CalibrationSheetResponse]
    total: int


class GaugeHistoryCardBase(BaseModel):
    description: str = Field(min_length=1, max_length=180)
    control_no: str = Field(min_length=1, max_length=120)
    validation_standard: str = Field(min_length=1, max_length=180)
    location: str = Field(min_length=1, max_length=180)
    frequency_of_validation: str = Field(min_length=1, max_length=120)
    serial_number: str = Field(min_length=1, max_length=40)
    inspection_item: str = Field(min_length=1, max_length=180)
    specification: str = Field(min_length=1, max_length=180)
    inspection_instruments: str = Field(min_length=1, max_length=180)
    remarks: Optional[str] = Field(default="", max_length=500)
    validation_date: str = Field(min_length=1, max_length=80)
    observation_a: Optional[str] = Field(default="", max_length=120)
    observation_b: Optional[str] = Field(default="", max_length=120)
    observation_c: Optional[str] = Field(default="", max_length=120)
    observation_d: Optional[str] = Field(default="", max_length=120)
    observation_e: Optional[str] = Field(default="", max_length=120)
    judgment: str = Field(min_length=1, max_length=40)
    due_date: str = Field(min_length=1, max_length=80)
    rectification_done: Optional[str] = Field(default="", max_length=255)
    inspection_by: str = Field(min_length=1, max_length=120)
    hod: str = Field(min_length=1, max_length=120)


class GaugeHistoryCardCreate(GaugeHistoryCardBase):
    pass


class GaugeHistoryCardUpdate(BaseModel):
    description: Optional[str] = Field(default=None, min_length=1, max_length=180)
    control_no: Optional[str] = Field(default=None, min_length=1, max_length=120)
    validation_standard: Optional[str] = Field(default=None, min_length=1, max_length=180)
    location: Optional[str] = Field(default=None, min_length=1, max_length=180)
    frequency_of_validation: Optional[str] = Field(default=None, min_length=1, max_length=120)
    serial_number: Optional[str] = Field(default=None, min_length=1, max_length=40)
    inspection_item: Optional[str] = Field(default=None, min_length=1, max_length=180)
    specification: Optional[str] = Field(default=None, min_length=1, max_length=180)
    inspection_instruments: Optional[str] = Field(default=None, min_length=1, max_length=180)
    remarks: Optional[str] = Field(default=None, max_length=500)
    validation_date: Optional[str] = Field(default=None, min_length=1, max_length=80)
    observation_a: Optional[str] = Field(default=None, max_length=120)
    observation_b: Optional[str] = Field(default=None, max_length=120)
    observation_c: Optional[str] = Field(default=None, max_length=120)
    observation_d: Optional[str] = Field(default=None, max_length=120)
    observation_e: Optional[str] = Field(default=None, max_length=120)
    judgment: Optional[str] = Field(default=None, min_length=1, max_length=40)
    due_date: Optional[str] = Field(default=None, min_length=1, max_length=80)
    rectification_done: Optional[str] = Field(default=None, max_length=255)
    inspection_by: Optional[str] = Field(default=None, min_length=1, max_length=120)
    hod: Optional[str] = Field(default=None, min_length=1, max_length=120)


class GaugeHistoryCardResponse(GaugeHistoryCardBase):
    id: int
    created_by: str
    updated_at: datetime

    model_config = {"from_attributes": True}


class GaugeHistoryCardListResponse(BaseModel):
    items: list[GaugeHistoryCardResponse]
    total: int
