import os

from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware
from starlette.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware

from .csrf import CSRFMiddleware
from . import auth
from .admin.router import router as admin_router
from .boutique_api import router as boutique_api_router


def create_app() -> FastAPI:
    app = FastAPI()

    # --- Sessions (ADMIN) ---
    session_secret = os.getenv("SESSION_SECRET_KEY", "dev_insecure_change_me")
    app.add_middleware(
        SessionMiddleware,
        secret_key=session_secret,
        # En prod: https_only=True
        https_only=False,
        same_site="lax",
    )

    # --- CORS (FRONT boutique) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            os.getenv("FRONT_ORIGIN", "http://localhost:3000"),
        ],
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

    # --- Routes ---
    app.include_router(auth.router)
    app.include_router(admin_router)
    app.include_router(boutique_api_router)

    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse(url="/admin/login")

    return app


app = create_app()
