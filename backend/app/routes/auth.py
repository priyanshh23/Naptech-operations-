import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from jose import JWTError, jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.middleware.auth import get_current_user, has_full_access_email
from app.models.user import User, UserRole
from app.schemas.auth import AuthResponse, ChangePasswordRequest, ForgotPasswordRequest, GoogleLoginRequest, LoginRequest, RegisterRequest
from app.services.user_service import authenticate_user, create_user, get_user_by_email
from app.utils.config import settings
from app.utils.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
DEFAULT_PASSWORD = "password"
ADMIN_EMAIL = "admin@naptech.in"
BUILT_IN_USERS: dict[str, tuple[str, UserRole]] = {
    "priyanshgupta9877@gmail.com": ("Priyansh Gupta", UserRole.MANAGER),
    "naptechprecision@gmail.com": ("Naptech Precision", UserRole.MANAGER),
    ADMIN_EMAIL: ("Admin", UserRole.MANAGER),
    "inventory@naptech.in": ("Inventory Operator", UserRole.INVENTORY),
    "production@naptech.in": ("Production Operator", UserRole.PRODUCTION),
    "quality@naptech.in": ("Quality Operator", UserRole.QUALITY),
    "maintenance@naptech.in": ("Maintenance Operator", UserRole.MAINTENANCE),
}


def _display_name_from_email(email: str) -> str:
    name = email.split("@")[0].replace(".", " ").replace("_", " ").replace("-", " ").strip()
    return name.title() or "Naptech User"


def _auth_response(user) -> AuthResponse:
    token = create_access_token(user.email)
    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    try:
        normalized_role = UserRole(role_value)
    except ValueError:
        normalized_role = UserRole.WORKER

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": normalized_role,
        },
    )


def _is_email_allowed(email: str) -> bool:
    normalized_email = email.strip().lower()
    allowed_domain = settings.allowed_login_domain.strip().lower().lstrip("@")
    return (
        has_full_access_email(normalized_email)
        or normalized_email in settings.login_allowlist_emails
        or bool(allowed_domain and normalized_email.endswith(f"@{allowed_domain}"))
    )


def _assert_allowed_login(email: str) -> None:
    if not _is_email_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Use an approved company account.",
        )


def _assert_password_strength(password: str) -> None:
    if len(password.strip()) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters.")


def _role_for_email(email: str) -> UserRole:
    normalized_email = email.strip().lower()
    if normalized_email in BUILT_IN_USERS:
        return BUILT_IN_USERS[normalized_email][1]
    if has_full_access_email(normalized_email):
        return UserRole.MANAGER
    return UserRole.WORKER


def _sync_authorized_role(db: Session, user: User) -> User:
    expected_role = _role_for_email(user.email)
    current_role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if current_role != expected_role.value:
        user.role = expected_role.value
        db.commit()
        db.refresh(user)
    return user


def _ensure_builtin_password_user(db: Session, email: str, password: str) -> None:
    normalized_email = email.strip().lower()
    if password != DEFAULT_PASSWORD or normalized_email not in BUILT_IN_USERS:
        return

    name, role = BUILT_IN_USERS[normalized_email]
    existing_user = get_user_by_email(db, normalized_email)
    if not existing_user:
        create_user(
            db,
            RegisterRequest(name=name, email=normalized_email, password=DEFAULT_PASSWORD, role=role),
        )
        return

    existing_user.name = name
    existing_user.role = role.value
    existing_user.password = hash_password(DEFAULT_PASSWORD)
    db.commit()
    db.refresh(existing_user)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    _assert_allowed_login(str(payload.email))
    _assert_password_strength(payload.password)
    user = create_user(db, payload)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        login_email = str(payload.email).strip().lower()
        _assert_allowed_login(login_email)
        _ensure_builtin_password_user(db, login_email, payload.password)

        user = authenticate_user(db, payload.email, payload.password)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        return _auth_response(_sync_authorized_role(db, user))
    except HTTPException:
        raise
    except Exception:
        # Avoid leaking a 500 for auth failures; surface a stable message to UI.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")


@router.post("/google", response_model=AuthResponse)
def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not settings.google_client_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google login is not configured")

    if payload.credential:
        try:
            claims = jwt.get_unverified_claims(payload.credential)
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google credential")

        if claims.get("aud") != settings.google_client_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google client")
    elif payload.access_token:
        claims = _google_userinfo(payload.access_token)
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google token is required")

    email = str(claims.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email not available")
    _assert_allowed_login(email)

    user = get_user_by_email(db, email)
    if not user:
        user = create_user(
            db,
            RegisterRequest(
                name=str(claims.get("name") or email.split("@")[0]),
                email=email,
                password=f"google::{email}",
                role=_role_for_email(email),
            ),
        )

    return _auth_response(_sync_authorized_role(db, user))


@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict[str, str]:
    email = str(payload.email).strip().lower()
    _assert_allowed_login(email)
    _assert_password_strength(payload.new_password)
    if not settings.password_reset_code or payload.reset_code.strip() != settings.password_reset_code:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid password reset code.")

    user = get_user_by_email(db, email)
    if not user:
        name, role = BUILT_IN_USERS.get(email, (_display_name_from_email(email), UserRole.WORKER))
        create_user(db, RegisterRequest(name=name, email=email, password=payload.new_password, role=role))
    else:
        user.password = hash_password(payload.new_password)
        user.role = _role_for_email(email).value
        db.commit()

    return {"message": "Password updated. You can sign in with the new password."}


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    _assert_password_strength(payload.new_password)
    user = get_user_by_email(db, current_user.email)
    if not user or not verify_password(payload.current_password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Current password is incorrect.")

    user.password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password changed successfully."}


def _google_userinfo(access_token: str) -> dict:
    request = Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    try:
        with urlopen(request, timeout=8) as response:
            return json.loads(response.read().decode("utf-8"))
    except (OSError, URLError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google access token")
