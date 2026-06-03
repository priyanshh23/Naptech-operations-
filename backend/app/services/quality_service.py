from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.quality_rejection import QualityRejection
from app.models.user import User
from app.schemas.quality import QualityRejectionCreate, QualityRejectionUpdate


def _latest_ordering():
    return QualityRejection.date.desc(), QualityRejection.updated_at.desc(), QualityRejection.id.desc()


def _query_rejections(search: Optional[str] = None):
    statement = select(QualityRejection)
    if search:
        pattern = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                QualityRejection.serial_number.ilike(pattern),
                QualityRejection.machine_number.ilike(pattern),
                QualityRejection.part_name.ilike(pattern),
                QualityRejection.reason.ilike(pattern),
                QualityRejection.cause.ilike(pattern),
                QualityRejection.cr_mr.ilike(pattern),
                QualityRejection.remarks.ilike(pattern),
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
