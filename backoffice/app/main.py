from fastapi import FastAPI
from app.db.database import engine, Base
from app.routes import user_routes, devis_routes, robe_routes, transformation_routes

# Création automatique des tables dans la base de données
Base.metadata.create_all(bind=engine)

# Initialisation de l'application FastAPI
app = FastAPI()

# Inclusion des routes
app.include_router(user_routes.router)
app.include_router(devis_routes.router)
app.include_router(robe_routes.router)
app.include_router(transformation_routes.router)
