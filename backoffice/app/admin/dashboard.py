from fastapi import APIRouter, Depends, Request
from datetime import date, datetime, timedelta
from typing import Optional
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
    devis_statut: Optional[str] = None,
    bc_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    def _parse_date(s: Optional[str]) -> Optional[date]:
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    dt_from = datetime.combine(d_from, datetime.min.time()) if d_from else None
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )

    total_boutiques = db.query(func.count(models.Boutique.id)).scalar() or 0

    # ---- Devis (filtrés) ----
    devis_q = db.query(models.Devis)
    if devis_statut and devis_statut != "ALL":
        try:
            devis_q = devis_q.filter(
                models.Devis.statut == models.StatutDevis(devis_statut)
            )
        except Exception:
            pass
    if dt_from:
        devis_q = devis_q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        devis_q = devis_q.filter(models.Devis.date_creation < dt_to_excl)

    total_devis = devis_q.count() or 0

    devis_par_statut_rows = (
        devis_q.with_entities(models.Devis.statut, func.count(models.Devis.id))
        .group_by(models.Devis.statut)
        .all()
    )

    devis_par_statut = {}
    for statut_obj, count in devis_par_statut_rows:
        label = getattr(statut_obj, "value", None) or str(statut_obj)
        devis_par_statut[label] = count

    # ---- Bons de commande (filtrés) ----
    bc_q = (
        db.query(models.BonCommande)
        .join(models.Devis, models.BonCommande.devis_id == models.Devis.id)
    )
    if bc_statut and bc_statut != "ALL":
        try:
            bc_q = bc_q.filter(
                models.BonCommande.statut == models.StatutBonCommande(bc_statut)
            )
        except Exception:
            pass
    if dt_from:
        bc_q = bc_q.filter(models.BonCommande.date_creation >= dt_from)
    if dt_to_excl:
        bc_q = bc_q.filter(models.BonCommande.date_creation < dt_to_excl)

    total_bc = bc_q.count() or 0

    return templates.TemplateResponse(
        "admin_dashboard.html",
        {
            "request": request,
            "admin": admin,
            "total_boutiques": total_boutiques,
            "total_devis": total_devis,
            "total_bc": total_bc,
            "devis_par_statut": devis_par_statut,
            "devis_statuts": [s.value for s in models.StatutDevis],
            "bc_statuts": [s.value for s in models.StatutBonCommande],
            "filters": {
                "devis_statut": devis_statut or "ALL",
                "bc_statut": bc_statut or "ALL",
                "date_from": d_from.isoformat() if d_from else "",
                "date_to": d_to.isoformat() if d_to else "",
            },
            "page": "dashboard",
        },
    )


# ========= API graphiques =========

@router.get("/admin/api/devis_par_statut")
def api_devis_par_statut(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    devis_statut = request.query_params.get("devis_statut")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    def _parse_date(s: Optional[str]) -> Optional[date]:
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    dt_from = datetime.combine(d_from, datetime.min.time()) if d_from else None
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )

    q = db.query(models.Devis)
    if devis_statut and devis_statut != "ALL":
        try:
            q = q.filter(models.Devis.statut == models.StatutDevis(devis_statut))
        except Exception:
            pass
    if dt_from:
        q = q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        q = q.filter(models.Devis.date_creation < dt_to_excl)

    rows = (
        q.with_entities(models.Devis.statut, func.count(models.Devis.id))
        .group_by(models.Devis.statut)
        .all()
    )
    return {
        "labels": [getattr(r[0], "value", None) or str(r[0]) for r in rows],
        "data": [r[1] for r in rows],
    }


@router.get("/admin/api/ca_par_boutique")
def api_ca_par_boutique(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    devis_statut = request.query_params.get("devis_statut")
    date_from = request.query_params.get("date_from")
    date_to = request.query_params.get("date_to")

    def _parse_date(s: Optional[str]) -> Optional[date]:
        if not s:
            return None
        try:
            return date.fromisoformat(s)
        except Exception:
            return None

    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    dt_from = datetime.combine(d_from, datetime.min.time()) if d_from else None
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )

    devis_join = db.query(models.Devis)
    if devis_statut and devis_statut != "ALL":
        try:
            devis_join = devis_join.filter(
                models.Devis.statut == models.StatutDevis(devis_statut)
            )
        except Exception:
            pass
    if dt_from:
        devis_join = devis_join.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        devis_join = devis_join.filter(models.Devis.date_creation < dt_to_excl)

    devis_sq = (
        devis_join.with_entities(
            models.Devis.id.label("id"),
            models.Devis.boutique_id.label("boutique_id"),
            models.Devis.prix_total.label("prix_total"),
        )
        .subquery()
    )

    rows = (
        db.query(models.Boutique.nom, func.coalesce(func.sum(devis_sq.c.prix_total), 0))
        .outerjoin(devis_sq, models.Boutique.id == devis_sq.c.boutique_id)
        .group_by(models.Boutique.id)
        .all()
    )
    return {
        "labels": [r[0] for r in rows],
        "data": [float(r[1]) for r in rows],
    }
