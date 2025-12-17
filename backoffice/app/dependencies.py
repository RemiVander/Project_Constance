"""Shared FastAPI dependencies.

This module centralises common dependencies (DB sessions, etc.) so route
modules don't re-implement the same boilerplate.
"""

from __future__ import annotations

from typing import Generator

from sqlalchemy.orm import Session

from .database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Provide a SQLAlchemy session per request."""

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
