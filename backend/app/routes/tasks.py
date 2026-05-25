from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, require_roles
from app.models.production_task import TaskStatus
from app.models.user import User, UserRole
from app.schemas.production_task import ProductionTaskCreate, ProductionTaskResponse, ProductionTaskUpdate
from app.services.task_service import complete_task, create_task, list_tasks, update_task

router = APIRouter(prefix="/tasks", tags=["production tasks"])


@router.get("", response_model=list[ProductionTaskResponse])
def get_tasks(
    status_filter: TaskStatus | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return list_tasks(db, status_filter)


@router.post("", response_model=ProductionTaskResponse, status_code=status.HTTP_201_CREATED)
def create_production_task(
    payload: ProductionTaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR)),
):
    return create_task(db, payload)


@router.put("/{task_id}", response_model=ProductionTaskResponse)
def update_production_task(
    task_id: int,
    payload: ProductionTaskUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.WORKER)),
):
    return update_task(db, task_id, payload)


@router.put("/{task_id}/complete", response_model=ProductionTaskResponse)
def complete_production_task(
    task_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.WORKER)),
):
    return complete_task(db, task_id)

