from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.production import (
    MachineAnalyticsRow,
    ProductionEntryCreate,
    ProductionEntryListResponse,
    ProductionEntryResponse,
    ProductionEntryUpdate,
    ProductionSummaryResponse,
)
from app.services.production_service import (
    create_production_entries,
    create_production_entry,
    delete_production_entry,
    get_machine_analytics,
    get_production_summary,
    list_production_entries,
    update_production_entry,
)

router = APIRouter(tags=["production"])

@router.get("/production-entry", response_model=ProductionEntryListResponse)
def get_production_entries(
    search: Optional[str] = Query(default=None),
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductionEntryListResponse:
    items, total = list_production_entries(db, search, date_from, date_to)
    return ProductionEntryListResponse(items=items, total=total)


@router.post("/production-entry", response_model=ProductionEntryResponse, status_code=status.HTTP_201_CREATED)
def post_production_entry(
    payload: ProductionEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PRODUCTION)),
) -> ProductionEntryResponse:
    return create_production_entry(db, payload, current_user)


@router.post("/production-entry/bulk", response_model=list[ProductionEntryResponse], status_code=status.HTTP_201_CREATED)
def post_production_entries(
    payload: list[ProductionEntryCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.PRODUCTION)),
) -> list[ProductionEntryResponse]:
    return create_production_entries(db, payload, current_user)


@router.put("/production-entry/{entry_id}", response_model=ProductionEntryResponse)
def put_production_entry(
    entry_id: int,
    payload: ProductionEntryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.PRODUCTION)),
) -> ProductionEntryResponse:
    return update_production_entry(db, entry_id, payload)


@router.delete("/production-entry/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_production_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.PRODUCTION)),
) -> None:
    delete_production_entry(db, entry_id)


@router.get("/production-summary", response_model=ProductionSummaryResponse)
def production_summary(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ProductionSummaryResponse:
    return get_production_summary(db, date_from, date_to)


@router.get("/machine-analytics", response_model=list[MachineAnalyticsRow])
def machine_analytics(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[MachineAnalyticsRow]:
    return get_machine_analytics(db, date_from, date_to)
