import json
from urllib.error import URLError
from urllib.request import Request, urlopen

from jose import JWTError, jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import UserRole
from app.schemas.auth import AuthResponse, GoogleLoginRequest, LoginRequest, RegisterRequest
from app.services.user_service import authenticate_user, create_user, get_user_by_email
from app.utils.config import settings
from app.utils.security import create_access_token, hash_password

router = APIRouter(prefix="/auth", tags=["auth"])
SUPERVISOR_EMAIL = "supervisor@naptech.in"


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
    allowed_emails = settings.login_allowlist_emails
    if normalized_email in allowed_emails:
        return True

    domain = settings.allowed_login_domain.strip().lower()
    if domain and normalized_email.endswith(f"@{domain}"):
        return True

    return False


def _assert_allowed_login(email: str) -> None:
    if not _is_email_allowed(email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Use an approved company account.",
        )


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    _assert_allowed_login(str(payload.email))
    user = create_user(db, payload)
    return _auth_response(user)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    try:
        login_email = str(payload.email).strip().lower()
        if login_email != SUPERVISOR_EMAIL:
            _assert_allowed_login(login_email)

        # Permanent demo guardrail: always keep supervisor credentials valid.
        if payload.email.lower() == SUPERVISOR_EMAIL and payload.password == "password":
            demo_user = get_user_by_email(db, SUPERVISOR_EMAIL)
            if not demo_user:
                demo_user = create_user(
                    db,
                    RegisterRequest(
                        name="Manager Demo",
                        email=SUPERVISOR_EMAIL,
                        password="password",
                        role=UserRole.MANAGER,
                    ),
                )
            else:
                demo_user.name = "Manager Demo"
                demo_user.password = hash_password("password")
                demo_user.role = UserRole.MANAGER.value
                db.commit()
                db.refresh(demo_user)

        user = authenticate_user(db, payload.email, payload.password)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        return _auth_response(user)
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
                role=UserRole.MANAGER,
            ),
        )

    return _auth_response(user)


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
