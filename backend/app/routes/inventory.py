from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_full_access, require_roles
from app.models.user import User, UserRole
from app.schemas.inventory import (
    InventoryBalancePreview,
    InventoryEntryCreate,
    InventoryEntryListResponse,
    InventoryEntryResponse,
    InventoryEntryUpdate,
    InventoryLogListResponse,
    InventorySummaryResponse,
)
from app.services.inventory_service import (
    create_inventory_entry,
    delete_inventory_entry,
    get_inventory_balance_preview,
    get_inventory_summary,
    list_inventory_entries,
    list_inventory_logs,
    update_inventory_entry,
)

router = APIRouter(tags=["inventory"])

@router.get("/inventory-entry", response_model=InventoryEntryListResponse)
def get_inventory_entries(
    search: Optional[str] = Query(default=None),
    part_name: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InventoryEntryListResponse:
    items, total = list_inventory_entries(db, search, part_name, date_from, date_to)
    return InventoryEntryListResponse(items=items, total=total)


@router.post("/inventory-entry", response_model=InventoryEntryResponse, status_code=status.HTTP_201_CREATED)
def post_inventory_entry(
    payload: InventoryEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.INVENTORY)),
) -> InventoryEntryResponse:
    return create_inventory_entry(db, payload, current_user)


@router.put("/inventory-entry/{entry_id}", response_model=InventoryEntryResponse)
def put_inventory_entry(
    entry_id: int,
    payload: InventoryEntryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.INVENTORY)),
) -> InventoryEntryResponse:
    return update_inventory_entry(db, entry_id, payload)


@router.delete("/inventory-entry/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_inventory_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_inventory_entry(db, entry_id)


@router.get("/inventory-entry/preview", response_model=InventoryBalancePreview)
def inventory_entry_preview(
    part_name: str = Query(min_length=1),
    in_quantity: int = Query(default=0, ge=0),
    out_quantity: int = Query(default=0, ge=0),
    rejection_quantity: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InventoryBalancePreview:
    return get_inventory_balance_preview(db, part_name, in_quantity, out_quantity, rejection_quantity)


@router.get("/inventory-summary", response_model=InventorySummaryResponse)
def inventory_summary(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InventorySummaryResponse:
    return get_inventory_summary(db, date_from, date_to)


@router.get("/inventory-logs", response_model=InventoryLogListResponse)
def inventory_logs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    part_name: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> InventoryLogListResponse:
    items, total = list_inventory_logs(db, page, page_size, search, part_name, date_from, date_to)
    return InventoryLogListResponse(items=items, total=total, page=page, page_size=page_size)
