from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.inventory import InventoryCreate, InventoryLogResponse, InventoryResponse, InventoryUpdate
from app.services.inventory_service import (
    create_inventory_item,
    delete_inventory_item,
    list_inventory,
    list_inventory_logs,
    update_inventory_item,
)

router = APIRouter(prefix="/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryResponse])
def get_inventory(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    items = list_inventory(db, search)
    for item in items:
        item.is_low_stock = item.quantity <= item.minimum_stock
    return items


@router.post("", response_model=InventoryResponse, status_code=status.HTTP_201_CREATED)
def create_inventory(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
):
    item = create_inventory_item(db, payload, current_user)
    item.is_low_stock = item.quantity <= item.minimum_stock
    return item


@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory(
    inventory_id: int,
    payload: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
):
    item = update_inventory_item(db, inventory_id, payload, current_user)
    item.is_low_stock = item.quantity <= item.minimum_stock
    return item


@router.delete("/{inventory_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
) -> None:
    delete_inventory_item(db, inventory_id, current_user)


@router.get("/logs", response_model=list[InventoryLogResponse])
def get_inventory_logs(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
) -> list:
    return list_inventory_logs(db)
