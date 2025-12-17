from fastapi import APIRouter, Depends, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin
from ..dependencies import get_db
from .common import templates

router = APIRouter()

# ========= Auth admin =========

@router.get("/admin/login")
def login_page(request: Request):
    error = None
    if request.query_params.get("error") == "1":
        error = "Identifiants invalides"

    return templates.TemplateResponse(
        "admin_login.html",
        {
            "request": request,
            "error": error,
        },
    )


# ========= Dashboard =========

@router.get("/admin/dashboard")
def admin_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    total_boutiques = db.query(func.count(models.Boutique.id)).scalar() or 0
    total_devis = db.query(func.count(models.Devis.id)).scalar() or 0
    devis_par_statut_rows = (
        db.query(models.Devis.statut, func.count(models.Devis.id))
        .group_by(models.Devis.statut)
        .all()
    )
    devis_par_statut = {row[0].value: row[1] for row in devis_par_statut_rows}

    return templates.TemplateResponse(
        "admin_dashboard.html",
        {
            "request": request,
            "admin": admin,
            "total_boutiques": total_boutiques,
            "total_devis": total_devis,
            "devis_par_statut": devis_par_statut,
            "page": "dashboard",
        },
    )


# ========= API graphiques =========

@router.get("/admin/api/devis_par_statut")
def api_devis_par_statut(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    rows = (
        db.query(models.Devis.statut, func.count(models.Devis.id))
        .group_by(models.Devis.statut)
        .all()
    )
    return {
        "labels": [r[0].value for r in rows],
        "data": [r[1] for r in rows],
    }


@router.get("/admin/api/ca_par_boutique")
def api_ca_par_boutique(
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    rows = (
        db.query(models.Boutique.nom, func.coalesce(func.sum(models.Devis.prix_total), 0))
        .outerjoin(models.Devis, models.Boutique.id == models.Devis.boutique_id)
        .group_by(models.Boutique.id)
        .all()
    )
    return {
        "labels": [r[0] for r in rows],
        "data": [float(r[1]) for r in rows],
    }



