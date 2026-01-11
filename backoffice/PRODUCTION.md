# Configuration pour la mise en production

## Où configurer les variables d'environnement ?

### Méthode recommandée : Fichier `.env`

1. **Créer le fichier `.env` à la racine du projet** (à côté de `docker-compose.yml`)
   
   Sur Windows (PowerShell):
   ```powershell
   Copy-Item ENV_EXAMPLE.txt .env
   ```
   
   Sur Linux/Mac:
   ```bash
   cp ENV_EXAMPLE.txt .env
   ```

2. **Éditer le fichier `.env`** avec un éditeur de texte et remplir toutes les valeurs nécessaires (voir ci-dessous)

3. **Le fichier `.env` est déjà dans `.gitignore`** - il ne sera pas commité dans Git (sécurité)

4. **Le fichier `ENV_EXAMPLE.txt`** sert de modèle et peut être versionné (sans valeurs sensibles)

### Alternative : Variables d'environnement système

Vous pouvez aussi définir les variables directement dans votre système ou dans la configuration de votre hébergeur (VPS, PaaS, etc.). Dans ce cas, le fichier `.env` n'est pas nécessaire.

## Variables d'environnement obligatoires

### Sécurité
```bash
# Clés secrètes (GÉNÉRER DES VALEURS ALEATOIRES FORTES)
SESSION_SECRET_KEY=<générer une clé secrète aléatoire de 32+ caractères>
BOUTIQUE_SECRET_KEY=<générer une clé secrète aléatoire de 32+ caractères>

# Détection de l'environnement de production
ENVIRONMENT=production
# OU
PRODUCTION=true

# Configuration HTTPS/Secure (activées automatiquement si ENVIRONMENT=production)
# Optionnel si ENVIRONMENT=production, sinon:
HTTPS_ONLY=true
SECURE_COOKIES=true

# SameSite pour les cookies (optionnel, "strict" par défaut en production)
COOKIE_SAME_SITE=strict
```

### URLs de production
```bash
# URL du frontend boutique (Next.js)
FRONT_ORIGIN=https://votre-domaine-front.com
FRONT_BASE_URL=https://votre-domaine-front.com

# URL de l'API/Backend
BASE_URL=https://votre-domaine-api.com
```

### Email
```bash
# Email admin pour recevoir les notifications
ADMIN_EMAIL=cellierconstance@gmail.com

# Configuration SMTP (obligatoire en production)
# ⭐ RECOMMANDÉ: SendGrid (voir CONFIGURATION_SENDGRID.md pour les détails)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=votre-clé-api-sendgrid-commence-par-SG
SMTP_FROM=noreply@votre-domaine.com

# Optionnel: rediriger tous les emails vers une adresse de debug
# MAIL_DEBUG_TO=debug@example.com
```

### Base de données
```bash
# URL de la base de données (SQLite par défaut, peut être PostgreSQL en production)
DATABASE_URL=sqlite:////data/robes_demi_mesure.db
# OU pour PostgreSQL:
# DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Seed des données initiales
```bash
# Pour créer les admins et les données d'exemple au premier démarrage
SEED_SAMPLE_DATA=1
# Puis mettre à 0 après le premier démarrage pour éviter de réinitialiser les données
```

## Génération des clés secrètes

Pour générer des clés secrètes sécurisées, utilisez:

```python
import secrets
print(secrets.token_urlsafe(32))  # Pour SESSION_SECRET_KEY
print(secrets.token_urlsafe(32))  # Pour BOUTIQUE_SECRET_KEY
```

Ou en ligne de commande:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Checklist de mise en production

- [ ] Générer et définir `SESSION_SECRET_KEY` (clé aléatoire forte)
- [ ] Générer et définir `BOUTIQUE_SECRET_KEY` (clé aléatoire forte)
- [ ] Définir `ENVIRONMENT=production` ou `PRODUCTION=true`
- [ ] Configurer `FRONT_ORIGIN` avec l'URL HTTPS du frontend
- [ ] Configurer `FRONT_BASE_URL` avec l'URL HTTPS du frontend
- [ ] Configurer `BASE_URL` avec l'URL HTTPS de l'API
- [ ] Définir `ADMIN_EMAIL=cellierconstance@gmail.com`
- [ ] Configurer SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
- [ ] Vérifier que HTTPS est activé sur le serveur
- [ ] Vérifier que les cookies sécurisés sont activés (`secure=True`, `https_only=True`)
- [ ] Tester la création des admins avec `SEED_SAMPLE_DATA=1` au premier démarrage
- [ ] Mettre `SEED_SAMPLE_DATA=0` après le premier démarrage
- [ ] Vérifier que les notifications email fonctionnent
- [ ] Tester le reset de mot de passe admin
- [ ] Tester le changement de mot de passe admin

## Notes importantes

- Les tokens de reset de mot de passe admin sont stockés en mémoire. 
  En production avec plusieurs instances, utiliser Redis ou une base de données.
- En production, assurez-vous que le serveur est accessible uniquement en HTTPS.
- Les cookies seront automatiquement sécurisés (`secure=True`, `https_only=True`) si `ENVIRONMENT=production`.
- Le `same_site` des cookies est défini à "strict" par défaut en production pour une sécurité maximale.
