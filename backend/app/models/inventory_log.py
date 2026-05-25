from datetime import datetime
from enum import Enum
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class InventoryActionType(str, Enum):
    CREATED = "created"
    UPDATED = "updated"
    ADDED = "added"
    REMOVED = "removed"
    DELETED = "deleted"


class InventoryLog(Base):
    __tablename__ = "inventory_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    inventory_id: Mapped[Optional[int]] = mapped_column(ForeignKey("inventory.id"), nullable=True)
    action_type: Mapped[InventoryActionType] = mapped_column(String(32), nullable=False)
    quantity_changed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_by: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    inventory = relationship("Inventory", back_populates="logs")
    updated_by_user = relationship("User", back_populates="inventory_logs")
