from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class GaugeInventory(Base):
    __tablename__ = "gauge_inventory"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    gauge_name: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    gauge_specification: Mapped[str] = mapped_column(String(255), nullable=False)
    gauge_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    gauge_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gauge_no: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    wear_and_tear: Mapped[str] = mapped_column(String(10), nullable=False, default="No")
    gauge_company: Mapped[str] = mapped_column(String(180), nullable=False)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class GaugeStock(Base):
    __tablename__ = "gauge_stock"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    gauge_stock_qty: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    gauge_type: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    gauge_part_name: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class CalibrationSheet(Base):
    __tablename__ = "calibration_sheets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    serial_number: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    equipment_name: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    make: Mapped[str] = mapped_column(String(120), nullable=False)
    equipment_no: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    range_size: Mapped[str] = mapped_column(String(180), nullable=False)
    least_count: Mapped[str] = mapped_column(String(80), nullable=False)
    frequency_calibration: Mapped[str] = mapped_column(String(120), nullable=False)
    calibrated_on: Mapped[str] = mapped_column(String(80), nullable=False)
    calibration_due_on: Mapped[str] = mapped_column(String(80), nullable=False)
    location: Mapped[str] = mapped_column(String(180), nullable=False)
    remark: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)


class GaugeHistoryCard(Base):
    __tablename__ = "gauge_history_cards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    description: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    control_no: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    validation_standard: Mapped[str] = mapped_column(String(180), nullable=False)
    location: Mapped[str] = mapped_column(String(180), nullable=False)
    frequency_of_validation: Mapped[str] = mapped_column(String(120), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(40), nullable=False)
    inspection_item: Mapped[str] = mapped_column(String(180), nullable=False)
    specification: Mapped[str] = mapped_column(String(180), nullable=False)
    inspection_instruments: Mapped[str] = mapped_column(String(180), nullable=False)
    remarks: Mapped[str] = mapped_column(String(500), nullable=True, default="")
    validation_date: Mapped[str] = mapped_column(String(80), nullable=False)
    observation_a: Mapped[str] = mapped_column(String(120), nullable=True, default="")
    observation_b: Mapped[str] = mapped_column(String(120), nullable=True, default="")
    observation_c: Mapped[str] = mapped_column(String(120), nullable=True, default="")
    observation_d: Mapped[str] = mapped_column(String(120), nullable=True, default="")
    observation_e: Mapped[str] = mapped_column(String(120), nullable=True, default="")
    judgment: Mapped[str] = mapped_column(String(40), nullable=False)
    due_date: Mapped[str] = mapped_column(String(80), nullable=False)
    rectification_done: Mapped[str] = mapped_column(String(255), nullable=True, default="")
    inspection_by: Mapped[str] = mapped_column(String(120), nullable=False)
    hod: Mapped[str] = mapped_column(String(120), nullable=False)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
