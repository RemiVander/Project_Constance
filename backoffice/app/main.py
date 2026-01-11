import os

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from .config import (
    SESSION_SECRET_KEY,
    HTTPS_ONLY,
    COOKIE_SAME_SITE,
    FRONT_ORIGIN,
)
from .csrf import CSRFMiddleware
from . import auth
from .admin.router import router as admin_router
from .boutique_api import router as boutique_api_router


def create_app() -> FastAPI:
    app = FastAPI()

    # --- Sessions (ADMIN) ---
    app.add_middleware(
        SessionMiddleware,
        secret_key=SESSION_SECRET_KEY,
        https_only=HTTPS_ONLY,
        same_site=COOKIE_SAME_SITE,
    )

    # --- CORS (FRONT boutique) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONT_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- CSRF (ADMIN principalement) ---
    app.add_middleware(CSRFMiddleware)

    # --- Static (CSS/JS admin) ---
    static_dir = os.path.join(os.path.dirname(__file__), "static")
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")

    # --- Exception handler pour redirections (HTTP 307) ---
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        if exc.status_code == 307 and "Location" in exc.headers:
            return RedirectResponse(url=exc.headers["Location"], status_code=307)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    # --- Routes ---
    app.include_router(auth.router)
    app.include_router(admin_router)
    app.include_router(boutique_api_router)

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url="/admin/login")

    return app


app = create_app()
