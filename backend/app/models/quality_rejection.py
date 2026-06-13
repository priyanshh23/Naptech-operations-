from datetime import date as date_type
from datetime import datetime
from typing import Optional

from sqlalchemy import Date, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class QualityRejection(Base):
    __tablename__ = "quality_rejections"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date_type] = mapped_column(Date, index=True, nullable=False)
    shift: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    serial_number: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    machine_number: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    part_name: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    rejection_quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    cause: Mapped[str] = mapped_column(String(255), nullable=False)
    cr_mr: Mapped[str] = mapped_column(String(10), index=True, nullable=False)
    job_work: Mapped[str] = mapped_column(String(10), nullable=False, default="No")
    remarks: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
