import secrets
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.status import HTTP_403_FORBIDDEN

CSRF_SESSION_KEY = "csrf_token"
CSRF_HEADER_NAME = "x-csrf-token"


def _get_session(request: Request) -> Optional[dict]:
    """
    Retourne la session si SessionMiddleware est installé.
    Sinon None (et le middleware CSRF doit être non-bloquant).
    """
    if "session" not in request.scope:
        return None
    return request.session


def get_or_create_csrf_token(request: Request) -> str:
    session = _get_session(request)
    if session is None:
        return secrets.token_urlsafe(32)

    token = session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        session[CSRF_SESSION_KEY] = token
    return token


def rotate_csrf_token(request: Request) -> str:
    session = _get_session(request)
    token = secrets.token_urlsafe(32)
    if session is not None:
        session[CSRF_SESSION_KEY] = token
    return token


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    CSRF middleware léger.
    - Ne plante JAMAIS si SessionMiddleware n'est pas présent.
    - Protège uniquement les requêtes mutatives (POST/PUT/PATCH/DELETE) côté browser.
    """

    async def dispatch(self, request: Request, call_next):
        session = _get_session(request)
        if session is None:
            return await call_next(request)

        if request.method in ("GET", "HEAD", "OPTIONS"):
            return await call_next(request)

        session_token = session.get(CSRF_SESSION_KEY)
        header_token = request.headers.get(CSRF_HEADER_NAME)

        if not session_token or not header_token or header_token != session_token:
            return Response("CSRF token invalide", status_code=HTTP_403_FORBIDDEN)

        return await call_next(request)
