from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, UserRole
from app.services.user_service import get_user_by_email
from app.utils.config import settings
from app.utils.security import decode_access_token

bearer_scheme = HTTPBearer()
ADMIN_EMAIL = "admin@naptech.in"
FULL_ACCESS_EMAILS = {
    "priyanshgupta9877@gmail.com",
    "naptechprecision@gmail.com",
}
ROLE_BY_EMAIL = {
    ADMIN_EMAIL: UserRole.MANAGER.value,
    "inventory@naptech.in": UserRole.INVENTORY.value,
    "production@naptech.in": UserRole.PRODUCTION.value,
    "quality@naptech.in": UserRole.QUALITY.value,
    "maintenance@naptech.in": UserRole.MAINTENANCE.value,
    **{email: UserRole.MANAGER.value for email in FULL_ACCESS_EMAILS},
}


def has_full_access_email(email: str) -> bool:
    return email.strip().lower() in FULL_ACCESS_EMAILS


def has_full_access_role(user: User) -> bool:
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role_value in {UserRole.ADMIN.value, UserRole.MANAGER.value}


def _is_email_allowed(email: str) -> bool:
    normalized_email = email.strip().lower()
    allowed_domain = settings.allowed_login_domain.strip().lower().lstrip("@")
    return (
        has_full_access_email(normalized_email)
        or normalized_email in settings.login_allowlist_emails
        or bool(allowed_domain and normalized_email.endswith(f"@{allowed_domain}"))
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    email = decode_access_token(credentials.credentials)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not _is_email_allowed(user.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied. Use an approved company account.")
    expected_role = ROLE_BY_EMAIL.get(user.email.strip().lower())
    current_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if expected_role and current_role != expected_role:
        user.role = expected_role
        db.commit()
        db.refresh(user)
    return user


def require_full_access(current_user: User = Depends(get_current_user)) -> User:
    if not (has_full_access_email(current_user.email) or has_full_access_role(current_user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    return current_user


def require_roles(*roles: UserRole) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        if has_full_access_email(current_user.email) or has_full_access_role(current_user):
            return current_user

        role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        allowed = {role.value for role in roles}
        if role_value not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return current_user

    return dependency
