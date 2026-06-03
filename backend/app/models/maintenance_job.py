from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class MaintenanceJob(Base):
    __tablename__ = "maintenance_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_code: Mapped[str] = mapped_column(String(40), unique=True, index=True, nullable=False)
    machine: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    team: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    breakdown_from: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    breakdown_to: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    due_by: Mapped[datetime] = mapped_column(DateTime, index=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(120), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)
