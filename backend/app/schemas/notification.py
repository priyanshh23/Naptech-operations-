from datetime import datetime

from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: int
    message: str
    type: NotificationType
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}

