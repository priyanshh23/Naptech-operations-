from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, dashboard, inventory, notifications, tasks
from app.utils.config import settings

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
app.include_router(tasks.router)
app.include_router(dashboard.router)
app.include_router(notifications.router)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}

