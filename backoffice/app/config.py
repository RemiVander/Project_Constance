"""
Configuration de l'application.
Utilise des variables d'environnement pour détecter l'environnement (dev/prod).
"""
import os

# Détection de l'environnement de production
# En production, définir ENVIRONMENT=production ou PRODUCTION=true
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
IS_PRODUCTION = ENVIRONMENT == "production" or os.getenv("PRODUCTION", "false").lower() == "true"

# Clés secrètes (DOIVENT être définies en production via variables d'environnement)
SESSION_SECRET_KEY = os.getenv("SESSION_SECRET_KEY", "dev_insecure_change_me")
BOUTIQUE_SECRET_KEY = os.getenv("BOUTIQUE_SECRET_KEY", "CHANGE_ME_SECRET_KEY")

# Configuration HTTPS/Secure (True en production, False en développement)
HTTPS_ONLY = IS_PRODUCTION or os.getenv("HTTPS_ONLY", "false").lower() == "true"
SECURE_COOKIES = IS_PRODUCTION or os.getenv("SECURE_COOKIES", "false").lower() == "true"

# SameSite pour les cookies (lax en dev, strict en prod recommandé)
# Note: "strict" peut être trop restrictif, "lax" est un bon compromis même en prod
COOKIE_SAME_SITE = os.getenv("COOKIE_SAME_SITE", "strict" if IS_PRODUCTION else "lax")

# URLs (doivent être configurées en production)
FRONT_ORIGIN = os.getenv("FRONT_ORIGIN", "http://localhost:3000")
FRONT_BASE_URL = os.getenv("FRONT_BASE_URL", "http://localhost:3000")
BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")

# Email admin pour recevoir les notifications (doit être configuré en production)
# Définir ADMIN_EMAIL=cellierconstance@gmail.com en production
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
