from typing import Optional

from datetime import date, datetime, timedelta

import secrets
from fastapi import APIRouter, BackgroundTasks, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin, get_password_hash
from ..dependencies import get_db
from ..utils.mailer import send_boutique_password_email
from .common import templates

router = APIRouter()

class BoutiqueCreateRequest(BaseModel):
    nom: str
    email: EmailStr
    statut: Optional[str] = None
    numero_tva: Optional[str] = None
    


# ========= Boutiques =========

@router.get("/admin/boutiques")
def admin_boutiques(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutiques = db.query(models.Boutique).order_by(models.Boutique.nom).all()
    return templates.TemplateResponse(
        "admin_boutiques_list.html",
        {
            "request": request,
            "admin": admin,
            "boutiques": boutiques,
            "page": "boutiques",
            "sous_page": "boutiques",
        },
    )


@router.get("/admin/boutiques/create")
def boutique_create_form(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    return templates.TemplateResponse(
        "admin_boutique_create.html",
        {
            "request": request,
            "admin": admin,
            "page": "boutiques",
        },
    )


@router.post("/admin/boutiques/create")
def boutique_create(
    request: Request,
    background_tasks: BackgroundTasks,
    nom: str = Form(...),
    email: str = Form(...),
    gerant: str = Form(""),
    telephone: str = Form(""),
    adresse: str = Form(""),
    numero_tva: str = Form(""),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    existing = db.query(models.Boutique).filter(models.Boutique.email == email).first()
    if existing:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    plain_password = secrets.token_urlsafe(8)
    boutique = models.Boutique(
        nom=nom,
        email=email,
        gerant=gerant or None,
        telephone=telephone or None,
        adresse=adresse or None,
        numero_tva=numero_tva or None,
        mot_de_passe_hash=get_password_hash(plain_password),
        doit_changer_mdp=True,
    )
    db.add(boutique)
    db.commit()

    background_tasks.add_task(
        send_boutique_password_email,
        email,
        nom,
        plain_password,
    )

    return RedirectResponse(url="/admin/boutiques", status_code=302)


@router.post("/admin/boutiques/{boutique_id}/statut")
def boutique_change_statut(
    boutique_id: int,
    request: Request,
    statut: str = Form(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    try:
        boutique.statut = models.BoutiqueStatut(statut)
    except ValueError:
        return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)

    db.commit()
    return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)


@router.get("/admin/boutiques/{boutique_id}")
def boutique_detail(
    boutique_id: int,
    request: Request,
    devis_statut: Optional[str] = None,
    bc_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

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
    # Inclusif côté UI : on filtre < (date_to + 1 jour)
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )

    devis_q = db.query(models.Devis).filter(models.Devis.boutique_id == boutique.id)
    if devis_statut and devis_statut != "ALL":
        try:
            devis_q = devis_q.filter(models.Devis.statut == models.StatutDevis(devis_statut))
        except Exception:
            pass
    if dt_from:
        devis_q = devis_q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        devis_q = devis_q.filter(models.Devis.date_creation < dt_to_excl)

    devis = devis_q.order_by(models.Devis.date_creation.desc()).all()

    # Indicateurs basés sur la liste filtrée pour être cohérents avec les tableaux.
    total_ca = sum(d.prix_total for d in devis)
    nb_devis = len(devis)
    nb_acceptes = len([d for d in devis if d.statut == models.StatutDevis.ACCEPTE])
    taux_acceptation = (nb_acceptes / nb_devis * 100) if nb_devis else 0

    # Liste des statuts pour les filtres
    devis_statuts = [s.value for s in models.StatutDevis]
    bc_statuts = [s.value for s in models.StatutBonCommande]

    # Filtrage BC : on garde la liste de devis pour l'affichage, mais on passera les
    # paramètres au template et on filtrera la table BC sur la relation.
    # (On reste simple : le filtre BC s'applique au tableau BC uniquement.)
    def _bc_matches(bc: models.BonCommande) -> bool:
        if not bc:
            return False
        if bc_statut and bc_statut != "ALL":
            try:
                if bc.statut != models.StatutBonCommande(bc_statut):
                    return False
            except Exception:
                pass
        if dt_from and bc.date_creation and bc.date_creation < dt_from:
            return False
        if dt_to_excl and bc.date_creation and bc.date_creation >= dt_to_excl:
            return False
        return True

    devis_with_bc_filtered = [d for d in devis if d.bon_commande and _bc_matches(d.bon_commande)]

    return templates.TemplateResponse(
        "admin_boutique_detail.html",
        {
            "request": request,
            "admin": admin,
            "boutique": boutique,
            "devis": devis,
            "devis_with_bc": devis_with_bc_filtered,
            "total_ca": total_ca,
            "nb_devis": nb_devis,
            "nb_acceptes": nb_acceptes,
            "taux_acceptation": taux_acceptation,
            "filters": {
                "devis_statut": devis_statut or "ALL",
                "bc_statut": bc_statut or "ALL",
                "date_from": d_from.isoformat() if d_from else "",
                "date_to": d_to.isoformat() if d_to else "",
            },
            "devis_statuts": devis_statuts,
            "bc_statuts": bc_statuts,
            "page": "boutiques",
        },
    )

@router.get("/admin/boutiques/{boutique_id}/edit", response_class=HTMLResponse)
def boutique_edit_form(
    boutique_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    return templates.TemplateResponse(
        "admin_boutique_edit.html",
        {
            "request": request,
            "admin": admin,
            "boutique": boutique,
            "page": "boutiques",
        },
    )



@router.post("/admin/boutiques/{boutique_id}/edit")
def boutique_edit(
    boutique_id: int,
    request: Request,
    nom: str = Form(...),
    email: str = Form(...),
    gerant: str = Form(""),
    telephone: str = Form(""),
    adresse: str = Form(""),
    numero_tva: str = Form(""),
    db: Session = Depends(get_db),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    boutique.nom = nom
    boutique.email = email
    boutique.gerant = gerant or None
    boutique.telephone = telephone or None
    boutique.adresse = adresse or None
    boutique.numero_tva = numero_tva or None

    db.commit()
    return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)




@router.post("/admin/boutiques")
def create_boutique(
    payload: BoutiqueCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    # Créer la boutique dans la base de données
    boutique = models.Boutique(
        nom=payload.nom,
        email=payload.email,
        statut=payload.statut,
        numero_tva=payload.numero_tva,
    )

    # Générer un mot de passe temporaire
    temp_password = secrets.token_urlsafe(8)
    boutique.mot_de_passe_hash = get_password_hash(temp_password)
    boutique.doit_changer_mdp = True 
    db.add(boutique)
    db.commit()

    # Envoyer un email à la boutique avec le mot de passe temporaire
    background_tasks.add_task(
        send_boutique_password_email,
        boutique.email,
        boutique.nom,
        temp_password,
    )

    return {"ok": True, "boutique": boutique}
