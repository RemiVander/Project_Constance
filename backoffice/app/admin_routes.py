
from fastapi import APIRouter, Depends, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import secrets

from .database import SessionLocal
from .auth import get_current_admin, get_password_hash
from . import models
from .email_utils import send_boutique_password_email

templates = Jinja2Templates(directory="app/templates")

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/admin/login")
def login_page(request: Request):
    return templates.TemplateResponse("admin_login.html", {"request": request})


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


# ========= Suivi des boutiques =========

@router.get("/admin/boutiques")
def boutiques_list(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutiques = db.query(models.Boutique).order_by(models.Boutique.date_creation.desc()).all()
    return templates.TemplateResponse(
        "admin_boutiques_list.html",
        {
            "request": request,
            "admin": admin,
            "boutiques": boutiques,
            "page": "boutiques",
        },
    )


@router.get("/admin/boutiques/nouvelle")
def boutique_create_page(
    request: Request,
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


@router.post("/admin/boutiques/nouvelle")
def boutique_create(
    request: Request,
    nom: str = Form(...),
    email: str = Form(...),
    gerant: str = Form(""),
    telephone: str = Form(""),
    adresse: str = Form(""),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    plain_password = secrets.token_urlsafe(10)

    existing = db.query(models.Boutique).filter_by(email=email).first()
    if existing:
        return templates.TemplateResponse(
            "admin_boutique_create.html",
            {
                "request": request,
                "admin": admin,
                "error": "Une boutique avec cet email existe déjà.",
                "page": "boutiques",
            },
        )

    boutique = models.Boutique(
        nom=nom,
        email=email,
        gerant=gerant or None,
        telephone=telephone or None,
        adresse=adresse or None,
        mot_de_passe_hash=get_password_hash(plain_password),
        doit_changer_mdp=True,
    )
    db.add(boutique)
    db.commit()

    send_boutique_password_email(to_email=email, boutique_name=nom, password=plain_password)

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


# ========= Produits : modèles de robes =========

@router.get("/admin/produits/robes")
def list_robe_modeles(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    modeles = db.query(models.RobeModele).order_by(models.RobeModele.nom).all()
    return templates.TemplateResponse(
        "admin_robe_modeles.html",
        {
            "request": request,
            "admin": admin,
            "modeles": modeles,
            "page": "produits",
            "sous_page": "robes",
        },
    )


@router.post("/admin/produits/robes/create")
def create_robe_modele(
    request: Request,
    nom: str = Form(...),
    description: str = Form(""),
    actif: str = Form("on"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    m = models.RobeModele(
        nom=nom,
        description=description or None,
        actif=True if actif == "on" else False,
    )
    db.add(m)
    db.commit()
    return RedirectResponse(url="/admin/produits/robes", status_code=302)


@router.post("/admin/produits/robes/{modele_id}/update")
def update_robe_modele(
    modele_id: int,
    request: Request,
    nom: str = Form(...),
    description: str = Form(""),
    actif: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    m = db.query(models.RobeModele).get(modele_id)
    if not m:
        return RedirectResponse(url="/admin/produits/robes", status_code=302)
    m.nom = nom
    m.description = description or None
    m.actif = True if actif == "on" else False
    db.commit()
    return RedirectResponse(url="/admin/produits/robes", status_code=302)


@router.post("/admin/produits/robes/{modele_id}/delete")
def delete_robe_modele(
    modele_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    m = db.query(models.RobeModele).get(modele_id)
    if m:
        db.delete(m)
        db.commit()
    return RedirectResponse(url="/admin/produits/robes", status_code=302)


# ========= Produits : tarifs transformations =========

@router.get("/admin/tarifs/transformations")
def list_tarifs_transformations(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    tarifs = (
        db.query(models.TransformationTarif)
        .outerjoin(models.RobeModele, models.TransformationTarif.robe_modele_id == models.RobeModele.id)
        .order_by(models.TransformationTarif.categorie, models.RobeModele.nom, models.TransformationTarif.finition)
        .all()
    )
    modeles = db.query(models.RobeModele).order_by(models.RobeModele.nom).all()
    return templates.TemplateResponse(
        "admin_tarifs_transformations.html",
        {
            "request": request,
            "admin": admin,
            "tarifs": tarifs,
            "modeles": modeles,
            "page": "produits",
            "sous_page": "tarifs_transformations",
        },
    )


@router.post("/admin/tarifs/transformations/create")
def create_tarif_transformation(
    request: Request,
    categorie: str = Form(...),
    finition: str = Form(""),
    robe_modele_id: int = Form(0),
    epaisseur_ou_option: str = Form(""),
    prix: float = Form(0.0),
    est_decollete: str = Form("off"),
    ceinture_possible: str = Form("on"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    # Interprétation initiale des cases
    est_deco_bool = est_decollete == "on"
    ceinture_bool = ceinture_possible == "on"

    # Règle métier : est_decollete ne concerne que Décolleté devant / Décolleté dos
    if categorie not in ["Décolleté devant", "Décolleté dos"]:
        est_deco_bool = False

    # Règle métier : ceinture_possible ne concerne que Découpe devant
    if categorie != "Découpe devant":
        ceinture_bool = True

    t = models.TransformationTarif(
        categorie=categorie,
        finition=finition or None,
        robe_modele_id=robe_modele_id or None,
        epaisseur_ou_option=epaisseur_ou_option or None,
        prix=prix,
        est_decollete=est_deco_bool,
        ceinture_possible=ceinture_bool,
    )
    db.add(t)
    db.commit()
    return RedirectResponse(url="/admin/tarifs/transformations", status_code=302)


@router.post("/admin/tarifs/transformations/{tarif_id}/update")
def update_tarif_transformation(
    tarif_id: int,
    request: Request,
    categorie: str = Form(...),
    finition: str = Form(""),
    robe_modele_id: int = Form(0),
    epaisseur_ou_option: str = Form(""),
    prix: float = Form(0.0),
    est_decollete: str = Form("off"),
    ceinture_possible: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TransformationTarif).get(tarif_id)
    if not t:
        return RedirectResponse(url="/admin/tarifs/transformations", status_code=302)

    est_deco_bool = est_decollete == "on"
    ceinture_bool = ceinture_possible == "on"

    if categorie not in ["Décolleté devant", "Décolleté dos"]:
        est_deco_bool = False

    if categorie != "Découpe devant":
        ceinture_bool = True

    t.categorie = categorie
    t.finition = finition or None
    t.robe_modele_id = robe_modele_id or None
    t.epaisseur_ou_option = epaisseur_ou_option or None
    t.prix = prix
    t.est_decollete = est_deco_bool
    t.ceinture_possible = ceinture_bool
    db.commit()
    return RedirectResponse(url="/admin/tarifs/transformations", status_code=302)


@router.post("/admin/tarifs/transformations/{tarif_id}/delete")
def delete_tarif_transformation(
    tarif_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TransformationTarif).get(tarif_id)
    if t:
        db.delete(t)
        db.commit()
    return RedirectResponse(url="/admin/tarifs/transformations", status_code=302)


# ========= Produits : tarifs tissus =========

@router.get("/admin/tarifs/tissus")
def list_tarifs_tissus(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    tarifs = (
        db.query(models.TissuTarif)
        .outerjoin(models.RobeModele, models.TissuTarif.robe_modele_id == models.RobeModele.id)
        .order_by(models.TissuTarif.categorie, models.RobeModele.nom, models.TissuTarif.detail)
        .all()
    )
    modeles = db.query(models.RobeModele).order_by(models.RobeModele.nom).all()
    return templates.TemplateResponse(
        "admin_tarifs_tissus.html",
        {
            "request": request,
            "admin": admin,
            "tarifs": tarifs,
            "modeles": modeles,
            "page": "produits",
            "sous_page": "tarifs_tissus",
        },
    )


@router.post("/admin/tarifs/tissus/create")
def create_tarif_tissu(
    request: Request,
    categorie: str = Form(...),
    robe_modele_id: int = Form(0),
    detail: str = Form(...),
    forme: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = models.TissuTarif(
        categorie=categorie,
        robe_modele_id=robe_modele_id or None,
        detail=detail,
        forme=forme or None,
        prix=prix,
    )
    db.add(t)
    db.commit()
    return RedirectResponse(url="/admin/tarifs/tissus", status_code=302)


@router.post("/admin/tarifs/tissus/{tarif_id}/update")
def update_tarif_tissu(
    tarif_id: int,
    request: Request,
    categorie: str = Form(...),
    robe_modele_id: int = Form(0),
    detail: str = Form(...),
    forme: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TissuTarif).get(tarif_id)
    if not t:
        return RedirectResponse(url="/admin/tarifs/tissus", status_code=302)
    t.categorie = categorie
    t.robe_modele_id = robe_modele_id or None
    t.detail = detail
    t.forme = forme or None
    t.prix = prix
    db.commit()
    return RedirectResponse(url="/admin/tarifs/tissus", status_code=302)


@router.post("/admin/tarifs/tissus/{tarif_id}/delete")
def delete_tarif_tissu(
    tarif_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TissuTarif).get(tarif_id)
    if t:
        db.delete(t)
        db.commit()
    return RedirectResponse(url="/admin/tarifs/tissus", status_code=302)


# ========= Produits : finitions supplémentaires =========

@router.get("/admin/finitions_supplementaires")
def list_finitions_supp(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    finitions = db.query(models.FinitionSupplementaire).all()
    return templates.TemplateResponse(
        "admin_finitions_supp.html",
        {
            "request": request,
            "admin": admin,
            "finitions": finitions,
            "page": "produits",
            "sous_page": "finitions_supp",
        },
    )


@router.post("/admin/finitions_supplementaires/create")
def create_finition_supp(
    request: Request,
    nom: str = Form(...),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    f = models.FinitionSupplementaire(nom=nom, prix=prix)
    db.add(f)
    db.commit()
    return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)


@router.post("/admin/finitions_supplementaires/{finition_id}/update")
def update_finition_supp(
    finition_id: int,
    request: Request,
    nom: str = Form(...),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    f = db.query(models.FinitionSupplementaire).get(finition_id)
    if not f:
        return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)
    f.nom = nom
    f.prix = prix
    db.commit()
    return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)


@router.post("/admin/finitions_supplementaires/{finition_id}/delete")
def delete_finition_supp(
    finition_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    f = db.query(models.FinitionSupplementaire).get(finition_id)
    if f:
        db.delete(f)
        db.commit()
    return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)


# ========= Produits : accessoires =========

@router.get("/admin/produits/accessoires")
def list_accessoires(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    accessoires = db.query(models.Accessoire).all()
    return templates.TemplateResponse(
        "admin_accessoires.html",
        {
            "request": request,
            "admin": admin,
            "accessoires": accessoires,
            "page": "produits",
            "sous_page": "accessoires",
        },
    )


@router.post("/admin/produits/accessoires/create")
def create_accessoire(
    request: Request,
    nom: str = Form(...),
    description: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    a = models.Accessoire(
        nom=nom,
        description=description or None,
        prix=prix,
    )
    db.add(a)
    db.commit()
    return RedirectResponse(url="/admin/produits/accessoires", status_code=302)


@router.post("/admin/produits/accessoires/{accessoire_id}/update")
def update_accessoire(
    accessoire_id: int,
    request: Request,
    nom: str = Form(...),
    description: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    a = db.query(models.Accessoire).get(accessoire_id)
    if not a:
        return RedirectResponse(url="/admin/produits/accessoires", status_code=302)
    a.nom = nom
    a.description = description or None
    a.prix = prix
    db.commit()
    return RedirectResponse(url="/admin/produits/accessoires", status_code=302)


@router.post("/admin/produits/accessoires/{accessoire_id}/delete")
def delete_accessoire(
    accessoire_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    a = db.query(models.Accessoire).get(accessoire_id)
    if a:
        db.delete(a)
        db.commit()
    return RedirectResponse(url="/admin/produits/accessoires", status_code=302)
