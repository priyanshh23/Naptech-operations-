from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.utils.security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(select(User).where(User.email == email.strip().lower()))


def create_user(db: Session, payload: RegisterRequest) -> User:
    existing_user = get_user_by_email(db, payload.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        name=payload.name,
        email=str(payload.email).strip().lower(),
        password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None

    try:
        if verify_password(password, user.password):
            return user
    except Exception:
        # Keep auth stable even if an old row has a non-standard hash format.
        pass

    # Self-heal legacy/plain-text records by hashing on first valid login.
    if user.password == password:
        user.password = hash_password(password)
        db.commit()
        db.refresh(user)
        return user

    return None
