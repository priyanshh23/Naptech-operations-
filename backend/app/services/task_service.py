from datetime import datetime
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.production_task import ProductionTask, TaskStatus
from app.schemas.production_task import ProductionTaskCreate, ProductionTaskUpdate


def list_tasks(db: Session, status_filter: Optional[TaskStatus] = None) -> list[ProductionTask]:
    statement = select(ProductionTask).order_by(ProductionTask.created_at.desc())
    if status_filter:
        statement = statement.where(ProductionTask.status == status_filter)
    return list(db.scalars(statement).all())


def get_task(db: Session, task_id: int) -> ProductionTask:
    task = db.get(ProductionTask, task_id)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Production task not found")
    return task


def create_task(db: Session, payload: ProductionTaskCreate) -> ProductionTask:
    task = ProductionTask(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task_id: int, payload: ProductionTaskUpdate) -> ProductionTask:
    task = get_task(db, task_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def complete_task(db: Session, task_id: int) -> ProductionTask:
    task = get_task(db, task_id)
    task.status = TaskStatus.COMPLETED
    task.end_time = datetime.utcnow()
    db.commit()
    db.refresh(task)
    return task
