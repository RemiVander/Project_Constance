from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin
from ..dependencies import get_db
from .common import templates

router = APIRouter()

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
    tarifs = db.query(models.TransformationTarif).all()
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
    nb_epaisseurs: int = Form(0),
    prix: float = Form(0.0),
    est_decollete: str = Form("off"),
    ceinture_possible: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    robe_id = robe_modele_id or None
    if robe_id == 0:
        robe_id = None

    t = models.TransformationTarif(
        categorie=categorie,
        finition=finition or None,
        robe_modele_id=robe_id,
        epaisseur_ou_option=epaisseur_ou_option or None,
        nb_epaisseurs=nb_epaisseurs or None,
        prix=prix,
        est_decollete=True if est_decollete == "on" else False,
        ceinture_possible=True if ceinture_possible == "on" else False,
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
    nb_epaisseurs: int = Form(0),
    prix: float = Form(0.0),
    est_decollete: str = Form("off"),
    ceinture_possible: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TransformationTarif).get(tarif_id)
    if not t:
        return RedirectResponse(url="/admin/tarifs/transformations", status_code=302)

    robe_id = robe_modele_id or None
    if robe_id == 0:
        robe_id = None

    t.categorie = categorie
    t.finition = finition or None
    t.robe_modele_id = robe_id
    t.epaisseur_ou_option = epaisseur_ou_option or None
    t.nb_epaisseurs = nb_epaisseurs or None
    t.prix = prix
    t.est_decollete = True if est_decollete == "on" else False
    t.ceinture_possible = True if ceinture_possible == "on" else False

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
    tarifs = db.query(models.TissuTarif).all()
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
    nb_epaisseurs: int = Form(0),
    mono_epaisseur: str = Form("off"),
    matiere: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    robe_id = robe_modele_id or None
    if robe_id == 0:
        robe_id = None

    t = models.TissuTarif(
        categorie=categorie,
        robe_modele_id=robe_id,
        detail=detail,
        forme=forme or None,
        nb_epaisseurs=nb_epaisseurs or None,
        mono_epaisseur=True if mono_epaisseur == "on" else False,
        matiere=matiere or None,
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
    nb_epaisseurs: int = Form(0),
    mono_epaisseur: str = Form("off"),
    matiere: str = Form(""),
    prix: float = Form(0.0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    t = db.query(models.TissuTarif).get(tarif_id)
    if not t:
        return RedirectResponse(url="/admin/tarifs/tissus", status_code=302)

    robe_id = robe_modele_id or None
    if robe_id == 0:
        robe_id = None

    t.categorie = categorie
    t.robe_modele_id = robe_id
    t.detail = detail
    t.forme = forme or None
    t.nb_epaisseurs = nb_epaisseurs or None
    t.mono_epaisseur = True if mono_epaisseur == "on" else False
    t.matiere = matiere or None
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
    est_fente: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    f = models.FinitionSupplementaire(
        nom=nom,
        prix=prix,
        est_fente=True if est_fente == "on" else False,
    )
    db.add(f)
    db.commit()
    return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)


@router.post("/admin/finitions_supplementaires/{finition_id}/update")
def update_finition_supp(
    finition_id: int,
    request: Request,
    nom: str = Form(...),
    prix: float = Form(0.0),
    est_fente: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    f = db.query(models.FinitionSupplementaire).get(finition_id)
    if not f:
        return RedirectResponse(url="/admin/finitions_supplementaires", status_code=302)
    f.nom = nom
    f.prix = prix
    f.est_fente = True if est_fente == "on" else False
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


# ========= Produits : dentelles =========

@router.get("/admin/dentelles")
def admin_dentelles(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    dentelles = db.query(models.Dentelle).order_by(models.Dentelle.nom).all()
    return templates.TemplateResponse(
        "admin_dentelles.html",
        {
            "request": request,
            "admin": admin,
            "dentelles": dentelles,
            "page": "produits",
            "sous_page": "dentelles",
        },
    )


@router.post("/admin/dentelles/create")
def create_dentelle(
    request: Request,
    nom: str = Form(...),
    actif: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    actif_bool = actif.lower() in ("on", "true", "1")
    d = models.Dentelle(nom=nom, actif=actif_bool)
    db.add(d)
    db.commit()
    return RedirectResponse(url="/admin/dentelles", status_code=302)


@router.post("/admin/dentelles/{dentelle_id}/update")
def update_dentelle(
    dentelle_id: int,
    request: Request,
    nom: str = Form(...),
    actif: str = Form("off"),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    d = db.query(models.Dentelle).get(dentelle_id)
    if not d:
        return RedirectResponse(url="/admin/dentelles", status_code=302)

    actif_bool = actif.lower() in ("on", "true", "1")
    d.nom = nom
    d.actif = actif_bool
    db.commit()
    return RedirectResponse(url="/admin/dentelles", status_code=302)


@router.post("/admin/dentelles/{dentelle_id}/delete")
def delete_dentelle(
    dentelle_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    d = db.query(models.Dentelle).get(dentelle_id)
    if d:
        db.delete(d)
        db.commit()
    return RedirectResponse(url="/admin/dentelles", status_code=302)


# ========= Produits : types de mesures =========

@router.get("/admin/produits/mesures")
def list_mesures_types(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    mesures = (
        db.query(models.MesureType)
        .order_by(models.MesureType.ordre, models.MesureType.id)
        .all()
    )
    return templates.TemplateResponse(
        "admin_mesures.html",
        {
            "request": request,
            "admin": admin,
            "mesures": mesures,
            "page": "produits",
            "sous_page": "mesures",
        },
    )



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



