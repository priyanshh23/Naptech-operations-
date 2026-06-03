from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends
from fastapi import Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import require_full_access
from app.models.user import User
from app.schemas.dashboard import DashboardSummary
from app.services.dashboard_service import get_dashboard_summary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def get_dashboard(
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(require_full_access),
) -> DashboardSummary:
    return get_dashboard_summary(db, date_from, date_to)
