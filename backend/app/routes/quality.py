from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_full_access, require_roles
from app.models.user import User, UserRole
from app.schemas.quality import (
    CalibrationSheetCreate,
    CalibrationSheetListResponse,
    CalibrationSheetResponse,
    CalibrationSheetUpdate,
    GaugeHistoryCardCreate,
    GaugeHistoryCardListResponse,
    GaugeHistoryCardResponse,
    GaugeHistoryCardUpdate,
    GaugeInventoryCreate,
    GaugeInventoryListResponse,
    GaugeInventoryResponse,
    GaugeInventoryUpdate,
    GaugeStockCreate,
    GaugeStockListResponse,
    GaugeStockResponse,
    GaugeStockUpdate,
    QualityRejectionCreate,
    QualityRejectionListResponse,
    QualityRejectionResponse,
    QualityRejectionUpdate,
)
from app.services.quality_service import (
    create_calibration_sheet,
    create_gauge_history_card,
    create_gauge_inventory,
    create_gauge_stock,
    create_quality_rejection,
    delete_calibration_sheet,
    delete_gauge_history_card,
    delete_gauge_inventory,
    delete_gauge_stock,
    delete_quality_rejection,
    list_calibration_sheets,
    list_gauge_history_cards,
    list_gauge_inventory,
    list_gauge_stock,
    update_calibration_sheet,
    update_gauge_history_card,
    update_gauge_inventory,
    update_gauge_stock,
    list_quality_rejections,
    update_quality_rejection,
)

router = APIRouter(tags=["quality"])

@router.get("/quality-rejections", response_model=QualityRejectionListResponse)
def get_quality_rejections(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> QualityRejectionListResponse:
    items, total = list_quality_rejections(db, search)
    return QualityRejectionListResponse(items=items, total=total)


@router.post("/quality-rejections", response_model=QualityRejectionResponse, status_code=status.HTTP_201_CREATED)
def post_quality_rejection(
    payload: QualityRejectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.QUALITY)),
) -> QualityRejectionResponse:
    return create_quality_rejection(db, payload, current_user)


@router.put("/quality-rejections/{entry_id}", response_model=QualityRejectionResponse)
def put_quality_rejection(
    entry_id: int,
    payload: QualityRejectionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> QualityRejectionResponse:
    return update_quality_rejection(db, entry_id, payload)


@router.delete("/quality-rejections/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_quality_rejection(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_quality_rejection(db, entry_id)


@router.get("/gauge-inventory", response_model=GaugeInventoryListResponse)
def get_gauge_inventory(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> GaugeInventoryListResponse:
    items, total = list_gauge_inventory(db, search)
    return GaugeInventoryListResponse(items=items, total=total)


@router.post("/gauge-inventory", response_model=GaugeInventoryResponse, status_code=status.HTTP_201_CREATED)
def post_gauge_inventory(
    payload: GaugeInventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeInventoryResponse:
    return create_gauge_inventory(db, payload, current_user)


@router.put("/gauge-inventory/{entry_id}", response_model=GaugeInventoryResponse)
def put_gauge_inventory(
    entry_id: int,
    payload: GaugeInventoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeInventoryResponse:
    return update_gauge_inventory(db, entry_id, payload)


@router.delete("/gauge-inventory/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_gauge_inventory(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_gauge_inventory(db, entry_id)


@router.get("/gauge-stock", response_model=GaugeStockListResponse)
def get_gauge_stock(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> GaugeStockListResponse:
    items, total = list_gauge_stock(db, search)
    return GaugeStockListResponse(items=items, total=total)


@router.post("/gauge-stock", response_model=GaugeStockResponse, status_code=status.HTTP_201_CREATED)
def post_gauge_stock(
    payload: GaugeStockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeStockResponse:
    return create_gauge_stock(db, payload, current_user)


@router.put("/gauge-stock/{entry_id}", response_model=GaugeStockResponse)
def put_gauge_stock(
    entry_id: int,
    payload: GaugeStockUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeStockResponse:
    return update_gauge_stock(db, entry_id, payload)


@router.delete("/gauge-stock/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_gauge_stock(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_gauge_stock(db, entry_id)


@router.get("/calibration-sheets", response_model=CalibrationSheetListResponse)
def get_calibration_sheets(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CalibrationSheetListResponse:
    items, total = list_calibration_sheets(db, search)
    return CalibrationSheetListResponse(items=items, total=total)


@router.post("/calibration-sheets", response_model=CalibrationSheetResponse, status_code=status.HTTP_201_CREATED)
def post_calibration_sheet(
    payload: CalibrationSheetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.QUALITY)),
) -> CalibrationSheetResponse:
    return create_calibration_sheet(db, payload, current_user)


@router.put("/calibration-sheets/{entry_id}", response_model=CalibrationSheetResponse)
def put_calibration_sheet(
    entry_id: int,
    payload: CalibrationSheetUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> CalibrationSheetResponse:
    return update_calibration_sheet(db, entry_id, payload)


@router.delete("/calibration-sheets/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_calibration_sheet(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_calibration_sheet(db, entry_id)


@router.get("/gauge-history-cards", response_model=GaugeHistoryCardListResponse)
def get_gauge_history_cards(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> GaugeHistoryCardListResponse:
    items, total = list_gauge_history_cards(db, search)
    return GaugeHistoryCardListResponse(items=items, total=total)


@router.post("/gauge-history-cards", response_model=GaugeHistoryCardResponse, status_code=status.HTTP_201_CREATED)
def post_gauge_history_card(
    payload: GaugeHistoryCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeHistoryCardResponse:
    return create_gauge_history_card(db, payload, current_user)


@router.put("/gauge-history-cards/{entry_id}", response_model=GaugeHistoryCardResponse)
def put_gauge_history_card(
    entry_id: int,
    payload: GaugeHistoryCardUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> GaugeHistoryCardResponse:
    return update_gauge_history_card(db, entry_id, payload)


@router.delete("/gauge-history-cards/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_gauge_history_card(
    entry_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> None:
    delete_gauge_history_card(db, entry_id)
