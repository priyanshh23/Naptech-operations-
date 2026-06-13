from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.models.gauge import CalibrationSheet, GaugeHistoryCard, GaugeInventory, GaugeStock
from app.models.quality_rejection import QualityRejection
from app.models.user import User
from app.schemas.quality import (
    CalibrationSheetCreate,
    CalibrationSheetUpdate,
    GaugeHistoryCardCreate,
    GaugeHistoryCardUpdate,
    GaugeInventoryCreate,
    GaugeInventoryUpdate,
    GaugeStockCreate,
    GaugeStockUpdate,
    QualityRejectionCreate,
    QualityRejectionUpdate,
)
from app.utils.search import search_patterns


def _latest_ordering():
    return QualityRejection.date.desc(), QualityRejection.updated_at.desc(), QualityRejection.id.desc()


def _query_rejections(search: Optional[str] = None):
    statement = select(QualityRejection)
    if search:
        patterns = search_patterns(search)
        if patterns:
            statement = statement.where(
                or_(
                    *[
                        column.ilike(pattern)
                        for pattern in patterns
                        for column in (
                            cast(QualityRejection.date, String),
                            QualityRejection.shift,
                            QualityRejection.serial_number,
                            QualityRejection.machine_number,
                            QualityRejection.part_name,
                            cast(QualityRejection.rejection_quantity, String),
                            QualityRejection.reason,
                            QualityRejection.cr_mr,
                            QualityRejection.job_work,
                            QualityRejection.remarks,
                            cast(QualityRejection.updated_at, String),
                        )
                    ]
                )
            )
    return statement


def list_quality_rejections(db: Session, search: Optional[str] = None) -> tuple[list[QualityRejection], int]:
    base_statement = _query_rejections(search)
    total = db.scalar(select(func.count()).select_from(base_statement.subquery())) or 0
    items = list(db.scalars(base_statement.order_by(*_latest_ordering()).limit(500)).all())
    return items, int(total)


def create_quality_rejection(db: Session, payload: QualityRejectionCreate, user: User) -> QualityRejection:
    entry = QualityRejection(**payload.model_dump(), created_by=user.name, updated_at=datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_quality_rejection(db: Session, entry_id: int, payload: QualityRejectionUpdate) -> QualityRejection:
    entry = db.get(QualityRejection, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quality rejection row not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return entry


def delete_quality_rejection(db: Session, entry_id: int) -> None:
    entry = db.get(QualityRejection, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quality rejection row not found")

    db.delete(entry)
    db.commit()


def _gauge_inventory_ordering():
    return GaugeInventory.updated_at.desc(), GaugeInventory.id.desc()


def _gauge_stock_ordering():
    return GaugeStock.updated_at.desc(), GaugeStock.id.desc()


def _calibration_sheet_ordering():
    return CalibrationSheet.updated_at.desc(), CalibrationSheet.id.desc()


def _gauge_history_ordering():
    return GaugeHistoryCard.updated_at.desc(), GaugeHistoryCard.id.desc()


def _query_gauge_inventory(search: Optional[str] = None):
    statement = select(GaugeInventory)
    if search:
        patterns = search_patterns(search)
        if patterns:
            statement = statement.where(
                or_(
                    *[
                        column.ilike(pattern)
                        for pattern in patterns
                        for column in (
                            GaugeInventory.gauge_name,
                            GaugeInventory.gauge_specification,
                            GaugeInventory.gauge_type,
                            cast(GaugeInventory.gauge_qty, String),
                            GaugeInventory.gauge_no,
                            GaugeInventory.wear_and_tear,
                            GaugeInventory.gauge_company,
                            cast(GaugeInventory.updated_at, String),
                        )
                    ]
                )
            )
    return statement


def list_gauge_inventory(db: Session, search: Optional[str] = None) -> tuple[list[GaugeInventory], int]:
    base_statement = _query_gauge_inventory(search)
    total = db.scalar(select(func.count()).select_from(base_statement.subquery())) or 0
    items = list(db.scalars(base_statement.order_by(*_gauge_inventory_ordering()).limit(500)).all())
    return items, int(total)


def create_gauge_inventory(db: Session, payload: GaugeInventoryCreate, user: User) -> GaugeInventory:
    entry = GaugeInventory(**payload.model_dump(), created_by=user.name, updated_at=datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_gauge_inventory(db: Session, entry_id: int, payload: GaugeInventoryUpdate) -> GaugeInventory:
    entry = db.get(GaugeInventory, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge inventory row not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return entry


def delete_gauge_inventory(db: Session, entry_id: int) -> None:
    entry = db.get(GaugeInventory, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge inventory row not found")

    db.delete(entry)
    db.commit()


def _query_gauge_stock(search: Optional[str] = None):
    statement = select(GaugeStock)
    if search:
        patterns = search_patterns(search)
        if patterns:
            statement = statement.where(
                or_(
                    *[
                        column.ilike(pattern)
                        for pattern in patterns
                        for column in (
                            cast(GaugeStock.gauge_stock_qty, String),
                            GaugeStock.gauge_type,
                            GaugeStock.gauge_part_name,
                            cast(GaugeStock.updated_at, String),
                        )
                    ]
                )
            )
    return statement


def list_gauge_stock(db: Session, search: Optional[str] = None) -> tuple[list[GaugeStock], int]:
    base_statement = _query_gauge_stock(search)
    total = db.scalar(select(func.count()).select_from(base_statement.subquery())) or 0
    items = list(db.scalars(base_statement.order_by(*_gauge_stock_ordering()).limit(500)).all())
    return items, int(total)


def create_gauge_stock(db: Session, payload: GaugeStockCreate, user: User) -> GaugeStock:
    entry = GaugeStock(**payload.model_dump(), created_by=user.name, updated_at=datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_gauge_stock(db: Session, entry_id: int, payload: GaugeStockUpdate) -> GaugeStock:
    entry = db.get(GaugeStock, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge stock row not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return entry


def delete_gauge_stock(db: Session, entry_id: int) -> None:
    entry = db.get(GaugeStock, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge stock row not found")

    db.delete(entry)
    db.commit()


def _query_calibration_sheets(search: Optional[str] = None):
    statement = select(CalibrationSheet)
    if search:
        patterns = search_patterns(search)
        if patterns:
            statement = statement.where(
                or_(
                    *[
                        column.ilike(pattern)
                        for pattern in patterns
                        for column in (
                            CalibrationSheet.serial_number,
                            CalibrationSheet.equipment_name,
                            CalibrationSheet.make,
                            CalibrationSheet.equipment_no,
                            cast(CalibrationSheet.quantity, String),
                            CalibrationSheet.range_size,
                            CalibrationSheet.least_count,
                            CalibrationSheet.frequency_calibration,
                            CalibrationSheet.calibrated_on,
                            CalibrationSheet.calibration_due_on,
                            CalibrationSheet.location,
                            CalibrationSheet.remark,
                            cast(CalibrationSheet.updated_at, String),
                        )
                    ]
                )
            )
    return statement


def list_calibration_sheets(db: Session, search: Optional[str] = None) -> tuple[list[CalibrationSheet], int]:
    base_statement = _query_calibration_sheets(search)
    total = db.scalar(select(func.count()).select_from(base_statement.subquery())) or 0
    items = list(db.scalars(base_statement.order_by(*_calibration_sheet_ordering()).limit(500)).all())
    return items, int(total)


def create_calibration_sheet(db: Session, payload: CalibrationSheetCreate, user: User) -> CalibrationSheet:
    entry = CalibrationSheet(**payload.model_dump(), created_by=user.name, updated_at=datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_calibration_sheet(db: Session, entry_id: int, payload: CalibrationSheetUpdate) -> CalibrationSheet:
    entry = db.get(CalibrationSheet, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calibration sheet row not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return entry


def delete_calibration_sheet(db: Session, entry_id: int) -> None:
    entry = db.get(CalibrationSheet, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Calibration sheet row not found")

    db.delete(entry)
    db.commit()


def _query_gauge_history_cards(search: Optional[str] = None):
    statement = select(GaugeHistoryCard)
    if search:
        patterns = search_patterns(search)
        if patterns:
            statement = statement.where(
                or_(
                    *[
                        column.ilike(pattern)
                        for pattern in patterns
                        for column in (
                            GaugeHistoryCard.description,
                            GaugeHistoryCard.control_no,
                            GaugeHistoryCard.validation_standard,
                            GaugeHistoryCard.location,
                            GaugeHistoryCard.frequency_of_validation,
                            GaugeHistoryCard.serial_number,
                            GaugeHistoryCard.inspection_item,
                            GaugeHistoryCard.specification,
                            GaugeHistoryCard.inspection_instruments,
                            GaugeHistoryCard.remarks,
                            GaugeHistoryCard.validation_date,
                            GaugeHistoryCard.observation_a,
                            GaugeHistoryCard.observation_b,
                            GaugeHistoryCard.observation_c,
                            GaugeHistoryCard.observation_d,
                            GaugeHistoryCard.observation_e,
                            GaugeHistoryCard.judgment,
                            GaugeHistoryCard.due_date,
                            GaugeHistoryCard.rectification_done,
                            GaugeHistoryCard.inspection_by,
                            GaugeHistoryCard.hod,
                            cast(GaugeHistoryCard.updated_at, String),
                        )
                    ]
                )
            )
    return statement


def list_gauge_history_cards(db: Session, search: Optional[str] = None) -> tuple[list[GaugeHistoryCard], int]:
    base_statement = _query_gauge_history_cards(search)
    total = db.scalar(select(func.count()).select_from(base_statement.subquery())) or 0
    items = list(db.scalars(base_statement.order_by(*_gauge_history_ordering()).limit(500)).all())
    return items, int(total)


def create_gauge_history_card(db: Session, payload: GaugeHistoryCardCreate, user: User) -> GaugeHistoryCard:
    entry = GaugeHistoryCard(**payload.model_dump(), created_by=user.name, updated_at=datetime.utcnow())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_gauge_history_card(db: Session, entry_id: int, payload: GaugeHistoryCardUpdate) -> GaugeHistoryCard:
    entry = db.get(GaugeHistoryCard, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge history card row not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(entry)
    return entry


def delete_gauge_history_card(db: Session, entry_id: int) -> None:
    entry = db.get(GaugeHistoryCard, entry_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gauge history card row not found")

    db.delete(entry)
    db.commit()
