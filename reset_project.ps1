Write-Host "==> Arrêt des conteneurs et suppression des volumes (BDD écrasée)..." -ForegroundColor Yellow
docker compose down -v

Write-Host "==> Build de l'API (sans cache)..." -ForegroundColor Yellow
docker compose build --no-cache api

Write-Host "==> Build du front (sans cache)..." -ForegroundColor Yellow
docker compose build --no-cache front

Write-Host "==> Démarrage des conteneurs en arrière-plan..." -ForegroundColor Yellow
docker compose up -d

Write-Host "==> Initialisation de la base (tables + données d'exemple)..." -ForegroundColor Yellow
docker compose exec api python -m scripts.create_admin_and_sample

Write-Host "==> Tout est prêt. API sur http://localhost:8000, front sur http://localhost:3000" -ForegroundColor Green
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
