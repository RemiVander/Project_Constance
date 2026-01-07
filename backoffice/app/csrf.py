import secrets
from starlette.requests import Request
from starlette.responses import Response, PlainTextResponse
from starlette.middleware.base import BaseHTTPMiddleware

CSRF_SESSION_KEY = "_csrf_token"
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


def get_or_create_csrf_token(request: Request) -> str:
    """
    Requires SessionMiddleware (request.session) to be enabled.
    """
    token = request.session.get(CSRF_SESSION_KEY)
    if not token:
        token = secrets.token_urlsafe(32)
        request.session[CSRF_SESSION_KEY] = token
    return token


def rotate_csrf_token(request: Request) -> str:
    token = secrets.token_urlsafe(32)
    request.session[CSRF_SESSION_KEY] = token
    return token


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Minimal CSRF protection:
    - For unsafe HTTP methods, requires a CSRF token either:
      - form field `csrf_token` (application/x-www-form-urlencoded or multipart/form-data)
      - header `X-CSRF-Token` (useful for fetch/JSON)
    - Compares with session token.
    """

    async def dispatch(self, request: Request, call_next):
        if request.method in UNSAFE_METHODS:
            session_token = request.session.get(CSRF_SESSION_KEY)
            if not session_token:
                return PlainTextResponse("CSRF session missing", status_code=403)

            token = request.headers.get("X-CSRF-Token")

            # If not in header, try reading from form (only if form content-type)
            if not token:
                content_type = request.headers.get("content-type", "")
                if "application/x-www-form-urlencoded" in content_type or "multipart/form-data" in content_type:
                    form = await request.form()
                    token = form.get("csrf_token")

            if not token or token != session_token:
                return PlainTextResponse("Invalid CSRF token", status_code=403)

        response: Response = await call_next(request)
        return response
