from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.maintenance import (
    MaintenanceJobCreate,
    MaintenanceJobListResponse,
    MaintenanceJobResponse,
    MaintenanceJobUpdate,
)
from app.services.maintenance_service import (
    create_maintenance_job,
    delete_maintenance_job,
    list_maintenance_jobs,
    update_maintenance_job,
)

router = APIRouter(tags=["maintenance"])

@router.get("/maintenance-jobs", response_model=MaintenanceJobListResponse)
def get_maintenance_jobs(
    search: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> MaintenanceJobListResponse:
    items, total = list_maintenance_jobs(db, search)
    return MaintenanceJobListResponse(items=items, total=total)


@router.post("/maintenance-jobs", response_model=MaintenanceJobResponse, status_code=status.HTTP_201_CREATED)
def post_maintenance_job(
    payload: MaintenanceJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.MAINTENANCE)),
) -> MaintenanceJobResponse:
    return create_maintenance_job(db, payload, current_user)


@router.put("/maintenance-jobs/{job_id}", response_model=MaintenanceJobResponse)
def put_maintenance_job(
    job_id: int,
    payload: MaintenanceJobUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.MAINTENANCE)),
) -> MaintenanceJobResponse:
    return update_maintenance_job(db, job_id, payload)


@router.delete("/maintenance-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_maintenance_job(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.MAINTENANCE)),
) -> None:
    delete_maintenance_job(db, job_id)
