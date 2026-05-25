from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DELAYED = "delayed"
    COMPLETED = "completed"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class ProductionTask(Base):
    __tablename__ = "production_tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    task_name: Mapped[str] = mapped_column(String(180), index=True, nullable=False)
    assigned_worker: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
    status: Mapped[TaskStatus] = mapped_column(String(32), nullable=False, default=TaskStatus.PENDING.value)
    priority: Mapped[TaskPriority] = mapped_column(String(32), nullable=False, default=TaskPriority.MEDIUM.value)
    start_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

