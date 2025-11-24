from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware

from . import admin_routes, auth
from . import boutique_api

app = FastAPI(title="Back-office B2B Robes v4.1")

app.add_middleware(SessionMiddleware, secret_key="CHANGE_ME_SECRET_KEY")

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

app.mount("/static", StaticFiles(directory="app/static"), name="static")

app.include_router(auth.router)
app.include_router(admin_routes.router)
app.include_router(boutique_api.router)


@app.get("/")
def root():
    return RedirectResponse(url="/admin/login")
