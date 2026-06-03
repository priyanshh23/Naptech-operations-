from collections.abc import Generator
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.utils.config import settings


def _resolve_database_url() -> str:
    # Prefer Supabase DB URL when provided, otherwise keep existing local DB URL.
    database_url = settings.supabase_database_url.strip() or settings.database_url
    if not database_url:
        return settings.database_url

    parsed = urlparse(database_url)
    if parsed.scheme.startswith("postgresql"):
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        query.setdefault("sslmode", "require")
        parsed = parsed._replace(query=urlencode(query))
        return urlunparse(parsed)

    return database_url


database_url = _resolve_database_url()
engine_kwargs = {"pool_pre_ping": True}
if database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
elif database_url.startswith("postgresql"):
    engine_kwargs["connect_args"] = {"prepare_threshold": None}

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
