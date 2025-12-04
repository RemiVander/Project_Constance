# Project_Constance/backoffice/Dockerfile
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100

WORKDIR /app

# Installer les dépendances Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code de l'app
COPY app ./app
COPY scripts ./scripts

# Base SQLite intégrée à l'image
# (si tu veux garder tes données entre rebuilds, on ajustera avec un volume + init script)
RUN python -m scripts.init_db && python -m scripts.create_admin_and_sample

# Par défaut on utilise SQLite dans le conteneur
ENV DATABASE_URL=sqlite:///./robes_demi_mesure.db

# Si tu préfères que la DB soit à part :
# ENV DATABASE_URL=sqlite:////data/robes_demi_mesure.db

# Lancement de l'API
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
