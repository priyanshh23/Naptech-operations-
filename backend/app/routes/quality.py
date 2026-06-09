from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.quality import (
    QualityRejectionCreate,
    QualityRejectionListResponse,
    QualityRejectionResponse,
    QualityRejectionUpdate,
)
from app.services.quality_service import (
    create_quality_rejection,
    delete_quality_rejection,
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
    _: User = Depends(require_roles(UserRole.QUALITY)),
) -> None:
    delete_quality_rejection(db, entry_id)
