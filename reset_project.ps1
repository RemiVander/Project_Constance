Write-Host "⚠️  ATTENTION : ce script va SUPPRIMER les volumes Docker (donc la BDD) !" -ForegroundColor Red
Write-Host "    À utiliser UNIQUEMENT en développement." -ForegroundColor Red
Write-Host ""

$confirmation = Read-Host "Tape 'RESET' pour confirmer"
if ($confirmation -ne "RESET") {
  Write-Host "Annulé." -ForegroundColor Yellow
  exit 1
}

Write-Host "==> Arrêt des conteneurs et suppression des volumes (BDD supprimée)..." -ForegroundColor Yellow
docker compose down -v

Write-Host "==> Build de l'API (sans cache)..." -ForegroundColor Yellow
docker compose build --no-cache api

Write-Host "==> Build du front (sans cache)..." -ForegroundColor Yellow
docker compose build --no-cache front

Write-Host "==> Démarrage des conteneurs en arrière-plan..." -ForegroundColor Yellow
docker compose up -d

Write-Host "==> Attente courte pour que l'API soit up..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "==> Seed des données (admin + boutiques de test)..." -ForegroundColor Yellow
docker compose exec api python -m scripts.create_admin_and_sample

Write-Host "==> Vérification users..." -ForegroundColor Yellow
docker compose exec api python -c "from app.database import SessionLocal; from app import models; db=SessionLocal(); print('USERS:', db.query(models.User).count()); print([(u.id,u.email,str(u.type)) for u in db.query(models.User).all()][:20]); db.close()"

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
