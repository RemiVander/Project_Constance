Write-Host "==> Démarrage du projet sans réinitialisation de la base..." -ForegroundColor Cyan

# 1. Build (sans --no-cache pour conserver les layers)
Write-Host "==> Build des services (rapide, ne touche pas à la BDD)..." -ForegroundColor Yellow
docker compose build api
docker compose build front

# 2. Lancement en arrière-plan
Write-Host "==> Lancement des conteneurs..." -ForegroundColor Yellow
docker compose up -d

# 3. Affichage de l'état des conteneurs
Write-Host "==> Conteneurs actifs :" -ForegroundColor Green
docker compose ps

Write-Host ""
Write-Host "========================================"
Write-Host " Projet Constance démarré"
Write-Host "----------------------------------------"
Write-Host " API        : http://localhost:8000"
Write-Host " Front      : http://localhost:3000"
Write-Host " Serveur mail (smtp4dev) : http://localhost:5000"
Write-Host "========================================"
Write-Host ""
