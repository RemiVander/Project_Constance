from typing import Optional

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
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    devis = (
        db.query(models.Devis)
        .filter(models.Devis.boutique_id == boutique.id)
        .order_by(models.Devis.date_creation.desc())
        .all()
    )

    total_ca = sum(d.prix_total for d in devis)
    nb_devis = len(devis)
    nb_acceptes = len([d for d in devis if d.statut == models.StatutDevis.ACCEPTE])
    taux_acceptation = (nb_acceptes / nb_devis * 100) if nb_devis else 0

    return templates.TemplateResponse(
        "admin_boutique_detail.html",
        {
            "request": request,
            "admin": admin,
            "boutique": boutique,
            "devis": devis,
            "total_ca": total_ca,
            "nb_devis": nb_devis,
            "nb_acceptes": nb_acceptes,
            "taux_acceptation": taux_acceptation,
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
