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
SUPERVISOR_EMAIL = "supervisor@naptech.in"


def _is_email_allowed(email: str) -> bool:
    normalized_email = email.strip().lower()
    if normalized_email == SUPERVISOR_EMAIL:
        return True
    if normalized_email in settings.login_allowlist_emails:
        return True

    domain = settings.allowed_login_domain.strip().lower()
    if domain and normalized_email.endswith(f"@{domain}"):
        return True

    return False


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
    return user


def require_roles(*roles: UserRole) -> Callable:
    def dependency(current_user: User = Depends(get_current_user)) -> User:
        role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        allowed = {role.value for role in roles}
        if role_value not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
        return current_user

    return dependency
