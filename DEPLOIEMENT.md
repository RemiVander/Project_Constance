# 🚀 Guide de déploiement en production

Ce document liste tous les éléments nécessaires pour déployer l'application Constance Cellier sur internet.

## ✅ Ce qui est déjà en place

1. **Configuration Docker Compose** - Les services sont orchestrés
2. **Configuration SMTP (SendGrid)** - Envoi d'emails configuré
3. **Variables d'environnement** - Documentées dans `ENV_PRODUCTION_EXEMPLE.txt`
4. **Gestion des secrets** - Clés secrètes pour sessions et tokens
5. **Configuration HTTPS/Secure** - Prête pour HTTPS
6. **Gestion des admins** - Comptes admin configurés

## 🔴 Ce qui manque pour la production

### 1. **Hébergement / Serveur**

⚠️ **IMPORTANT :** Ne pas prendre d'hébergement web partagé (Starter, Perso, Pro, Performance) !

**Pourquoi ces offres ne conviennent PAS :**
- ❌ Ce sont des hébergements **partagés** (avec cPanel/Plesk)
- ❌ **Impossible d'installer Docker** sur ces offres
- ❌ Pas d'accès root/super-utilisateur nécessaire pour Docker
- ❌ Limités aux technologies PHP/MySQL classiques
- ✅ Elles incluent souvent un domaine (offerte 1ère année), MAIS...

**Votre application nécessite :**
- ✅ Docker et Docker Compose
- ✅ Accès root pour installer des logiciels
- ✅ Contrôle total du serveur (VPS)

**Conclusion :** Même si ces offres incluent un domaine, elles ne permettent PAS de faire tourner votre application Docker. Il faut absolument un **VPS (Virtual Private Server)**.

**Options recommandées :**

#### Option 1 : OVH VPS-1 (RECOMMANDÉ pour 10 utilisateurs)
- **Prix :** 3,82€ HT/mois (4,58€ TTC/mois) - le moins cher
- **Spécifications :**
  - 4 vCores
  - 8 GB RAM
  - 75 GB SSD
  - Bande passante : 400 Mbit/s
  - Trafic illimité
  - Sauvegarde automatique 1 jour
- **Avantages :** 
  - Prix très bas
  - **Largement suffisant** pour 10 utilisateurs (même surdimensionné, mais bon prix)
  - Support français
  - Beaucoup de RAM pour Docker (8 GB est excellent)
- **Conclusion :** C'est l'offre la plus cohérente pour votre usage

#### Option 2 : OVH VPS-2 (optionnel, si vous prévoyez de grandir)
- **Prix :** 5,95€ HT/mois (7,14€ TTC/mois)
- **Spécifications :**
  - 6 vCores
  - 12 GB RAM
  - 100 GB SSD NVMe
  - Bande passante : 1 Gbit/s
- **Avantages :** 
  - Plus de marge pour grandir (20-50 utilisateurs)
  - SSD NVMe (plus rapide)
  - Plus cher mais reste abordable
- **Conclusion :** Seulement si vous prévoyez beaucoup plus d'utilisateurs

#### Option 3 : Alternatives
- **Hetzner** : ~4-5€/mois (excellent rapport qualité/prix, Allemagne)
- **Scaleway** : ~5€/mois (France)
- **DigitalOcean** : ~6$/mois (international)

**Pour 10 utilisateurs :** Le **VPS-1 d'OVH à 3,82€ HT/mois (4,58€ TTC/mois)** est largement suffisant et le plus économique.

**Note :** OVH marque le VPS-3 comme "Recommandé", mais c'est trop cher et trop puissant pour seulement 10 utilisateurs. VPS-1 ou VPS-2 maximum.

### 2. **Domaine (OBLIGATOIRE - À acheter en plus du VPS)**

✅ **Action requise :** Acheter le domaine `constance-cellier.fr` (chez OVH ou ailleurs)

**Deux choses séparées mais nécessaires :**
1. **Le VPS (hébergement)** = Où votre site tourne (VPS-1 : 3,82€ HT/mois = 4,58€ TTC/mois)
2. **Le domaine** = L'adresse du site (constance-cellier.fr) (~10-15€/an)

**Recommandation :** Acheter les deux chez OVH pour simplifier (même compte, même facture)
- VPS-1 : 3,82€ HT/mois (4,58€ TTC/mois)
- Domaine : ~10-15€/an (~0,80-1,25€/mois)
- **Total : ~5,40-5,85€ TTC/mois** (moins de 6€/mois)

**Alternative :** Vous pouvez acheter le domaine ailleurs (Namecheap, Gandi, etc.) et pointer vers le VPS OVH

**Pourquoi c'est important :**
- Configuration DNS (A, CNAME, MX)
- Certificat SSL/TLS gratuit (Let's Encrypt)
- Email professionnel
- Authentification SendGrid avec domaine personnalisé (améliore la délivrabilité)

### 3. **Configuration DNS**

Une fois le domaine acheté, configurer les enregistrements DNS :

```
A     @           <IP_DU_SERVEUR>
A     www         <IP_DU_SERVEUR>
A     api         <IP_DU_SERVEUR>  (optionnel, pour sous-domaine API)
CNAME api         <DOMAINE_PRINCIPAL>  (ou A direct)
```

**À configurer dans le panneau OVH** (ou votre registrar) :
- Zone DNS du domaine `constance-cellier.fr`

### 4. **Choisir l'image système (OS)**

Lors de la configuration du VPS, vous devrez choisir un système d'exploitation :

**✅ RECOMMANDÉ : Ubuntu 22.04 LTS**
- Version LTS (Long Term Support) = support long terme (jusqu'en 2027)
- Stable et largement utilisé
- Excellent support de Docker
- Documentation abondante
- Dans le dropdown de version, sélectionnez **"Ubuntu 22.04 LTS"** (pas Ubuntu 25.04 qui n'est pas LTS)

**Alternative : Debian 12 (ou 13 si disponible)**
- Très stable
- Légèrement plus léger qu'Ubuntu
- Support Docker excellent aussi

**❌ À éviter :**
- Ubuntu 25.04 (pas LTS, moins stable pour production)
- Windows Server (payant, pas nécessaire pour Docker)

### 5. **Reverse Proxy (Nginx ou Traefik)**

**Pourquoi :** 
- Gestion HTTPS/SSL (Let's Encrypt)
- Routage des requêtes (frontend sur port 3000, API sur port 8000)
- Sécurité (cacher les ports internes)

**Option 1 : Nginx (recommandé)**
```nginx
# Configuration à créer sur le serveur
server {
    listen 80;
    server_name constance-cellier.fr www.constance-cellier.fr;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name constance-cellier.fr www.constance-cellier.fr;

    ssl_certificate /etc/letsencrypt/live/constance-cellier.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/constance-cellier.fr/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Admin (optionnel, pour sous-domaine)
    location /admin {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Option 2 : Traefik (plus simple avec Docker)**
- Intégration automatique avec Docker Compose
- Génération automatique des certificats SSL
- Configuration plus simple mais moins de contrôle

### 5. **Certificat SSL/TLS (Let's Encrypt)**

**Installation avec Certbot :**
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d constance-cellier.fr -d www.constance-cellier.fr
```

**Renouvellement automatique :**
```bash
sudo certbot renew --dry-run  # Test
# Ajouter dans crontab pour renouvellement automatique
```

### 6. **Configuration du fichier .env en production**

**Créer le fichier `.env` sur le serveur avec :**

```bash
# Environnement
ENVIRONMENT=production
PRODUCTION=true

# Clés secrètes (GÉNÉRER DES VALEURS UNIQUES ET FORTES)
SESSION_SECRET_KEY=<GENERER_ALEATOIREMENT_32_CARACTERES>
BOUTIQUE_SECRET_KEY=<GENERER_ALEATOIREMENT_32_CARACTERES>

# URLs (remplacer par votre domaine)
FRONT_ORIGIN=https://constance-cellier.fr
FRONT_BASE_URL=https://constance-cellier.fr
BASE_URL=https://constance-cellier.fr

# HTTPS/Secure (TRUE en production)
HTTPS_ONLY=true
SECURE_COOKIES=true
COOKIE_SAME_SITE=strict

# Base de données (SQLite pour commencer, PostgreSQL recommandé pour plus tard)
DATABASE_URL=sqlite:////data/robes_demi_mesure.db

# SMTP (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<VOTRE_API_KEY_SENDGRID>
SMTP_FROM=noreply@constance-cellier.fr  # OU cellierconstance@gmail.com si pas encore configuré

# Email admin
ADMIN_EMAIL=cellierconstance@gmail.com

# Pas de données de test
SEED_SAMPLE_DATA=0
```

**Générer les clés secrètes :**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# Faire ça 2 fois pour SESSION_SECRET_KEY et BOUTIQUE_SECRET_KEY
```

### 7. **Base de données**

**Option actuelle : SQLite** (pour démarrer)
- ✅ Simple, pas de serveur séparé
- ✅ Fonctionne pour de petits volumes
- ⚠️ Limite : 1 seule instance, pas de concurrence élevée

**Recommandation pour plus tard : PostgreSQL**
- Meilleures performances
- Support multi-instances
- Backups plus robustes
- Migration possible plus tard

### 8. **Sauvegarde (Backups)**

**Script de backup SQLite :**
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR
cp /data/robes_demi_mesure.db $BACKUP_DIR/backup_$DATE.db
# Garder seulement les 30 derniers backups
find $BACKUP_DIR -name "backup_*.db" -mtime +30 -delete
```

**Ajouter dans crontab :**
```bash
0 2 * * * /path/to/backup.sh  # Tous les jours à 2h du matin
```

### 9. **Firewall**

**Configuration UFW (Ubuntu) :**
```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 10. **Monitoring de base**

**Options :**
- **Uptime Robot** (gratuit) : Vérifie que le site est en ligne
- **Logs Docker** : `docker compose logs -f`
- **Alertes email** : En cas d'erreur serveur

### 11. **Configuration SendGrid avec domaine personnalisé** (optionnel mais recommandé)

**Une fois le domaine acheté :**
1. Dans SendGrid : Settings → Sender Authentication → Domain Authentication
2. Ajouter `constance-cellier.fr`
3. Configurer les enregistrements DNS (CNAME, TXT) dans OVH
4. Vérifier le domaine
5. Utiliser `noreply@constance-cellier.fr` comme `SMTP_FROM`

**Avantages :**
- Meilleure délivrabilité (moins de spams)
- Email professionnel
- Réputation de domaine

### 12. **Sécurité supplémentaire**

**Recommandations :**
- ✅ Mots de passe forts pour les admins (changer `test123`)
- ✅ Fail2ban pour protéger contre les attaques SSH
- ✅ Mises à jour système régulières
- ✅ Variables d'environnement jamais commitées dans Git

### 13. **Processus de déploiement**

**Étapes :**

1. **Préparer le serveur**
   ```bash
   # Sur le serveur
   sudo apt update && sudo apt upgrade -y
   sudo apt install docker.io docker-compose-plugin git -y
   sudo usermod -aG docker $USER
   # Redémarrer ou se reconnecter
   ```

2. **Cloner le projet**
   ```bash
   git clone <VOTRE_REPO> /opt/constance-cellier
   cd /opt/constance-cellier
   ```

3. **Configurer .env**
   ```bash
   cp ENV_PRODUCTION_EXEMPLE.txt .env
   nano .env  # Éditer avec les vraies valeurs
   ```

4. **Lancer les services**
   ```bash
   docker compose up -d
   ```

5. **Installer Nginx et Certbot**
   ```bash
   sudo apt install nginx certbot python3-certbot-nginx
   ```

6. **Configurer Nginx** (voir section 4)

7. **Obtenir le certificat SSL**
   ```bash
   sudo certbot --nginx -d constance-cellier.fr -d www.constance-cellier.fr
   ```

8. **Vérifier que tout fonctionne**
   - Frontend accessible sur https://constance-cellier.fr
   - API répond sur https://constance-cellier.fr/api
   - Admin accessible sur https://constance-cellier.fr/admin
   - Test de création de boutique et réception d'email

## 📋 Checklist de déploiement

- [ ] Serveur VPS commandé et configuré
- [ ] Domaine `constance-cellier.fr` acheté chez OVH
- [ ] DNS configurés (A, CNAME si nécessaire)
- [ ] Docker et Docker Compose installés sur le serveur
- [ ] Projet cloné sur le serveur
- [ ] Fichier `.env` créé avec toutes les variables
- [ ] Clés secrètes générées (SESSION_SECRET_KEY, BOUTIQUE_SECRET_KEY)
- [ ] SendGrid configuré avec API key
- [ ] Nginx installé et configuré
- [ ] Certificat SSL obtenu (Let's Encrypt)
- [ ] Services Docker lancés (`docker compose up -d`)
- [ ] Firewall configuré (ports 80, 443, 22)
- [ ] Backups configurés (script + cron)
- [ ] Test de connexion admin
- [ ] Test de création de boutique
- [ ] Test d'envoi d'email
- [ ] Monitoring de base configuré (Uptime Robot)
- [ ] Mots de passe admin changés (plus de `test123`)

## 🔄 Mises à jour futures

**Pour mettre à jour l'application :**
```bash
cd /opt/constance-cellier
git pull
docker compose build
docker compose up -d
docker compose restart  # Si besoin
```

## 📞 Support

- Documentation SendGrid : https://docs.sendgrid.com
- Let's Encrypt : https://letsencrypt.org
- Nginx : https://nginx.org/en/docs/
- OVH DNS : https://docs.ovh.com/fr/domaines/
