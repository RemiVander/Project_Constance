import os

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from . import admin_routes, auth
from . import boutique_api
from app.csrf import CSRFMiddleware

# -------------------------------------------------------------------
# App
# -------------------------------------------------------------------

app = FastAPI(title="Back-office B2B Robes v4.1")

# -------------------------------------------------------------------
# ENV / SESSION
# -------------------------------------------------------------------

ENV = os.getenv("ENV", "").lower()
IS_PROD = ENV in ("prod", "production")

SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY")
if not SESSION_SECRET_KEY:
    # OK en dev, INTERDIT en prod
    SESSION_SECRET_KEY = "dev-insecure-secret"

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET_KEY,
    https_only=IS_PROD,   # cookies Secure en prod
    same_site="lax",      # protection CSRF navigateur
)

# -------------------------------------------------------------------
# Security headers middleware
# -------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=()"

        # CSP volontairement permissive pour ne pas casser l’admin
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;"
        )

        return response


# -------------------------------------------------------------------
# Middlewares
# -------------------------------------------------------------------

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)

origins = [
    "http://localhost:3000",
    # "https://front-tondomaine.com",  # à activer en prod
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------------
# Static & routes
# -------------------------------------------------------------------

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(auth.router)
app.include_router(admin_routes.router)
app.include_router(boutique_api.router)

# -------------------------------------------------------------------
# Root
# -------------------------------------------------------------------

@app.get("/")
def root():
    return RedirectResponse(url="/admin/login")
