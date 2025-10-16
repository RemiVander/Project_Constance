from fastapi import FastAPI
from app.db.database import engine, Base
from app.routes import user_routes, devis_routes, robe_routes, transformation_routes

app = FastAPI()

# Include routes
app.include_router(user_routes.router)
app.include_router(devis_routes.router)
app.include_router(robe_routes.router)
app.include_router(transformation_routes.router)