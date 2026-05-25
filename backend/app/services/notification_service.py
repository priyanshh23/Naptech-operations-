from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification


def list_notifications(db: Session) -> list[Notification]:
    return list(db.scalars(select(Notification).order_by(Notification.created_at.desc())).all())

