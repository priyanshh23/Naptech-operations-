from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.models import Inventory, InventoryEntry, InventoryLog, MaintenanceJob, Notification, ProductionEntry, ProductionTask, QualityRejection, User
from app.models.user import UserRole
from app.routes import auth, dashboard, inventory, maintenance, notifications, production, quality, tasks
from app.schemas.auth import RegisterRequest
from app.services.production_service import seed_demo_production_entries
from app.services.user_service import create_user, get_user_by_email
from app.utils.config import settings
from app.utils.security import hash_password

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(inventory.router)
app.include_router(production.router)
app.include_router(quality.router)
app.include_router(maintenance.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)

    if settings.environment != "development":
        return

    with SessionLocal() as db:
        demo_users = [
            ("Admin", "admin@naptech.in", UserRole.MANAGER),
            ("Inventory Operator", "inventory@naptech.in", UserRole.INVENTORY),
            ("Production Operator", "production@naptech.in", UserRole.PRODUCTION),
            ("Quality Operator", "quality@naptech.in", UserRole.QUALITY),
            ("Maintenance Operator", "maintenance@naptech.in", UserRole.MAINTENANCE),
        ]
        for name, email, role in demo_users:
            existing_user = get_user_by_email(db, email)
            if not existing_user:
                create_user(
                    db,
                    RegisterRequest(
                        name=name,
                        email=email,
                        password="password",
                        role=role,
                    ),
                )
            else:
                existing_user.name = name
                existing_user.role = role.value
                existing_user.password = hash_password("password")
                db.commit()

        seed_demo_production_entries(db)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}
