from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import Optional

from app.models.inventory import Inventory
from app.models.inventory_log import InventoryActionType, InventoryLog
from app.models.user import User
from app.schemas.inventory import InventoryCreate, InventoryUpdate


def list_inventory(db: Session, search: Optional[str] = None) -> list[Inventory]:
    statement = select(Inventory).order_by(Inventory.product_name)
    if search:
        search_pattern = f"%{search}%"
        statement = statement.where(
            Inventory.product_name.ilike(search_pattern) | Inventory.sku_code.ilike(search_pattern)
        )
    return list(db.scalars(statement).all())


def get_inventory_item(db: Session, inventory_id: int) -> Inventory:
    item = db.get(Inventory, inventory_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inventory item not found")
    return item


def create_inventory_item(db: Session, payload: InventoryCreate, user: User) -> Inventory:
    item = Inventory(**payload.model_dump())
    db.add(item)
    db.flush()
    db.add(
        InventoryLog(
            inventory_id=item.id,
            action_type=InventoryActionType.CREATED,
            quantity_changed=item.quantity,
            updated_by=user.id,
        )
    )
    db.commit()
    db.refresh(item)
    return item


def update_inventory_item(db: Session, inventory_id: int, payload: InventoryUpdate, user: User) -> Inventory:
    item = get_inventory_item(db, inventory_id)
    previous_quantity = item.quantity

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    quantity_changed = item.quantity - previous_quantity
    action_type = InventoryActionType.UPDATED
    if quantity_changed > 0:
        action_type = InventoryActionType.ADDED
    elif quantity_changed < 0:
        action_type = InventoryActionType.REMOVED

    db.add(
        InventoryLog(
            inventory_id=item.id,
            action_type=action_type,
            quantity_changed=quantity_changed,
            updated_by=user.id,
        )
    )
    db.commit()
    db.refresh(item)
    return item


def delete_inventory_item(db: Session, inventory_id: int, user: User) -> None:
    item = get_inventory_item(db, inventory_id)
    db.add(
        InventoryLog(
            inventory_id=item.id,
            action_type=InventoryActionType.DELETED,
            quantity_changed=-item.quantity,
            updated_by=user.id,
        )
    )
    db.delete(item)
    db.commit()


def list_inventory_logs(db: Session) -> list[InventoryLog]:
    return list(db.scalars(select(InventoryLog).order_by(InventoryLog.timestamp.desc())).all())
