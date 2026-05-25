from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.inventory_log import InventoryActionType


class InventoryBase(BaseModel):
    product_name: str = Field(min_length=1, max_length=180)
    sku_code: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=0)
    minimum_stock: int = Field(ge=0)
    location: str = Field(min_length=1, max_length=120)


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    product_name: Optional[str] = Field(default=None, min_length=1, max_length=180)
    sku_code: Optional[str] = Field(default=None, min_length=1, max_length=80)
    quantity: Optional[int] = Field(default=None, ge=0)
    minimum_stock: Optional[int] = Field(default=None, ge=0)
    location: Optional[str] = Field(default=None, min_length=1, max_length=120)


class InventoryResponse(InventoryBase):
    id: int
    created_at: datetime
    updated_at: datetime
    is_low_stock: bool

    model_config = {"from_attributes": True}


class InventoryLogResponse(BaseModel):
    id: int
    inventory_id: Optional[int]
    action_type: InventoryActionType
    quantity_changed: int
    updated_by: Optional[int]
    timestamp: datetime

    model_config = {"from_attributes": True}
