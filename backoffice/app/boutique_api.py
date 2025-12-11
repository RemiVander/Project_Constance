from datetime import datetime
import json
import os
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Header, Cookie, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from .pdf_utils import generate_pdf_devis_bon


from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from io import BytesIO
import textwrap

from .database import SessionLocal
from . import models
from .auth import verify_password, get_password_hash


router = APIRouter(prefix="/api/boutique", tags=["Boutique API"])

# IMPORTANT : à modifier dans la vraie vie
SECRET_KEY = "CHANGE_ME_SECRET_KEY"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

TVA_RATE = 0.20
MARGE_BOUTIQUE = 2.5     # marge boutique sur prix créatrice
MARGE_CREATRICE = 1.6    # marge créatrice sur coût interne (prix_total)


# =========================
# Helpers prix
# =========================

def compute_prix_boutique_et_client(devis: models.Devis):
    """
    Calcule tous les montants à partir de devis.prix_total (coût interne).

    Retourne un dict :
    - partenaire_ht / partenaire_tva / partenaire_ttc
    - client_ht / client_tva / client_ttc
    """
    base_ht = devis.prix_total * MARGE_CREATRICE

    partenaire_ht = base_ht
    partenaire_tva = partenaire_ht * TVA_RATE
    partenaire_ttc = partenaire_ht + partenaire_tva

    client_ht = partenaire_ht * MARGE_BOUTIQUE
    client_tva = client_ht * TVA_RATE
    client_ttc = client_ht + client_tva

    return {
        "partenaire_ht": partenaire_ht,
        "partenaire_tva": partenaire_tva,
        "partenaire_ttc": partenaire_ttc,
        "client_ht": client_ht,
        "client_tva": client_tva,
        "client_ttc": client_ttc,
    }


def get_serializer():
    return URLSafeTimedSerializer(SECRET_KEY, salt="boutique-auth")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# Schémas Pydantic
# =========================

class BoutiquePublic(BaseModel):
    id: int
    nom: str
    email: EmailStr
    doit_changer_mdp: bool

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    boutique: BoutiquePublic


class LigneDevisCreate(BaseModel):
    robe_modele_id: Optional[int] = None
    description: Optional[str] = None
    quantite: int = 1
    prix_unitaire: float


class DevisCreateRequest(BaseModel):
    lignes: List[LigneDevisCreate]
    configuration: dict | None = None
    dentelle_id: int | None = None


class LigneDevisPublic(BaseModel):
    id: int
    robe_modele_id: Optional[int] = None
    description: Optional[str]
    quantite: int
    prix_unitaire: float

    model_config = {"from_attributes": True}


class DevisPublic(BaseModel):
    id: int
    numero_boutique: int
    statut: str
    date_creation: Optional[str]
    prix_total: float
    prix_boutique: float
    prix_client_conseille_ttc: float
    configuration: dict | None = None
    dentelle_id: int | None = None
    lignes: Optional[List["LigneDevisPublic"]] = None
    # NEW : mesures pour pré-remplir la page de correction
    mesures: Optional[List["MesureValeurPublic"]] = None

    model_config = {"from_attributes": True}


class MesureTypePublic(BaseModel):
    id: int
    code: str
    label: str
    obligatoire: bool
    ordre: int

    model_config = {"from_attributes": True}


class MesureValeurPublic(BaseModel):
    mesure_type_id: int
    valeur: float | None = None

    model_config = {"from_attributes": True}


class MesureValeurPayload(BaseModel):
    mesure_type_id: int
    valeur: float


class UpdateDevisStatutPayload(BaseModel):
    statut: Literal["EN_COURS", "ACCEPTE", "REFUSE"]
    mesures: Optional[List[MesureValeurPayload]] = None



class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class BonCommandePublic(BaseModel):
    id: int
    devis_id: int
    numero_devis: int
    date_creation: datetime
    montant_boutique_ht: float
    montant_boutique_ttc: float
    has_tva: bool
    statut: str
    commentaire_admin: Optional[str] = None
    commentaire_boutique: Optional[str] = None

    model_config = {"from_attributes": True}


# =========================
# Auth boutique
# =========================

def create_token_for_boutique(boutique: models.Boutique) -> str:
    s = get_serializer()
    return s.dumps({"boutique_id": boutique.id})


def get_current_boutique(
    db: Session = Depends(get_db),
    token_cookie: str | None = Cookie(default=None, alias="b2b_token"),
    authorization: str | None = Header(default=None, alias="Authorization"),
) -> models.Boutique:
    """
    Auth boutique :
    - en priorité via cookie HttpOnly 'b2b_token'
    - sinon via header Authorization: Bearer <token>
    """
    token: str | None = None

    if token_cookie:
        token = token_cookie
    elif authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Token manquant")

    s = get_serializer()
    try:
        data = s.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired:
        raise HTTPException(status_code=401, detail="Token expiré")
    except BadSignature:
        raise HTTPException(status_code=401, detail="Token invalide")

    boutique_id = data.get("boutique_id")
    if not boutique_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        raise HTTPException(status_code=401, detail="Boutique non trouvée")

    if boutique.statut == models.BoutiqueStatut.SUSPENDU:
        raise HTTPException(status_code=403, detail="Boutique suspendue")

    return boutique


# =========================
# Helpers DevisPublic
# =========================

def build_devis_public(
    devis: models.Devis,
    boutique: models.Boutique,
    include_lignes: bool = True,
) -> DevisPublic:
    prix = compute_prix_boutique_et_client(devis)
    has_tva = bool(boutique.numero_tva)

    if has_tva:
        prix_boutique_affiche = prix["partenaire_ht"]
    else:
        prix_boutique_affiche = prix["partenaire_ttc"]

    lignes_public: Optional[List[LigneDevisPublic]] = None
    if include_lignes:
        lignes_public = [
            LigneDevisPublic(
                id=l.id,
                robe_modele_id=l.robe_modele_id,
                description=l.description,
                quantite=l.quantite,
                prix_unitaire=l.prix_unitaire,
            )
            for l in (devis.lignes or [])
        ]

    mesures_public: Optional[List[MesureValeurPublic]] = None
    if include_lignes and getattr(devis, "mesures", None):
        mesures_public = [
            MesureValeurPublic(
                mesure_type_id=m.mesure_type_id,
                valeur=m.valeur,
            )
            for m in devis.mesures
        ]

    config_data: dict | None = None
    raw_config = getattr(devis, "configuration_json", None)
    if raw_config:
        try:
            config_data = json.loads(raw_config)
        except Exception:
            config_data = None

    return DevisPublic(
        id=devis.id,
        numero_boutique=devis.numero_boutique,
        statut=devis.statut.value if hasattr(devis.statut, "value") else str(devis.statut),
        date_creation=devis.date_creation.isoformat() if devis.date_creation else None,
        prix_total=devis.prix_total,
        prix_boutique=prix_boutique_affiche,
        prix_client_conseille_ttc=prix["client_ttc"],
        configuration=config_data,
        dentelle_id=devis.dentelle_id,
        lignes=lignes_public,
        mesures=mesures_public,
    )



# =========================
# Endpoints auth & profil
# =========================

@router.post("/login", response_model=LoginResponse)
def login_boutique(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    boutique = (
        db.query(models.Boutique)
        .filter(models.Boutique.email == payload.email)
        .first()
    )
    if not boutique:
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    if not boutique.mot_de_passe_hash:
        raise HTTPException(status_code=400, detail="Compte boutique sans mot de passe configuré")

    if not verify_password(payload.password, boutique.mot_de_passe_hash):
        raise HTTPException(status_code=400, detail="Email ou mot de passe incorrect")

    if boutique.statut == models.BoutiqueStatut.SUSPENDU:
        raise HTTPException(status_code=403, detail="Boutique suspendue")

    token = create_token_for_boutique(boutique)

    response.set_cookie(
        key="b2b_token",
        value=token,
        httponly=True,
        secure=False,  # mettre True en prod (HTTPS)
        samesite="lax",
        max_age=TOKEN_MAX_AGE_SECONDS,
        path="/",
    )

    return LoginResponse(
        access_token=token,
        boutique=BoutiquePublic(
            id=boutique.id,
            nom=boutique.nom,
            email=boutique.email,
            doit_changer_mdp=boutique.doit_changer_mdp,
        ),
    )


@router.get("/me", response_model=BoutiquePublic)
def get_me(
    boutique: models.Boutique = Depends(get_current_boutique),
):
    return boutique


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    if not verify_password(payload.old_password, boutique.mot_de_passe_hash or ""):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")

    boutique.mot_de_passe_hash = get_password_hash(payload.new_password)
    boutique.doit_changer_mdp = False
    db.commit()
    return {"ok": True}


@router.post("/logout")
def logout_boutique(response: Response):
    response.delete_cookie(
        key="b2b_token",
        path="/",
    )
    return {"ok": True}


# =========================
# Options pour construire un devis
# =========================

@router.get("/options")
def get_options(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    modeles = db.query(models.RobeModele).filter_by(actif=True).all()
    transfos = db.query(models.TransformationTarif).all()
    tissus = db.query(models.TissuTarif).all()
    finitions = db.query(models.FinitionSupplementaire).all()
    accessoires = db.query(models.Accessoire).all()
    dentelles = db.query(models.Dentelle).filter_by(actif=True).all()

    return {
        "robe_modeles": [
            {"id": m.id, "nom": m.nom, "description": m.description}
            for m in modeles
        ],
        "tarifs_transformations": [
            {
                "id": t.id,
                "categorie": t.categorie,
                "finition": t.finition,
                "robe_modele_id": t.robe_modele_id,
                "epaisseur_ou_option": t.epaisseur_ou_option,
                "prix": t.prix,
                "est_decollete": t.est_decollete,
                "ceinture_possible": t.ceinture_possible,
                "nb_epaisseurs": getattr(t, "nb_epaisseurs", None),
            }
            for t in transfos
        ],
        "tarifs_tissus": [
            {
                "id": t.id,
                "categorie": t.categorie,
                "robe_modele_id": t.robe_modele_id,
                "detail": t.detail,
                "forme": t.forme,
                "prix": t.prix,
                "nb_epaisseurs": getattr(t, "nb_epaisseurs", None),
                "mono_epaisseur": getattr(t, "mono_epaisseur", None),
                "matiere": getattr(t, "matiere", None),
            }
            for t in tissus
        ],
        "finitions_supplementaires": [
            {"id": f.id, "nom": f.nom, "prix": f.prix, "est_fente": f.est_fente}
            for f in finitions
        ],
        "accessoires": [
            {"id": a.id, "nom": a.nom, "description": a.description, "prix": a.prix}
            for a in accessoires
        ],
        "dentelles": [
            {"id": d.id, "nom": d.nom}
            for d in dentelles
        ],
    }


# =========================
# CRUD Devis
# =========================

@router.get("/devis", response_model=List[DevisPublic])
def list_devis(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    devis_list = (
        db.query(models.Devis)
        .filter(models.Devis.boutique_id == boutique.id)
        .order_by(models.Devis.date_creation.desc())
        .all()
    )
    return [build_devis_public(d, boutique, include_lignes=False) for d in devis_list]


@router.get("/devis/{devis_id}", response_model=DevisPublic)
def get_devis_detail(
    devis_id: int,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    d = (
        db.query(models.Devis)
        .filter(models.Devis.id == devis_id, models.Devis.boutique_id == boutique.id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    return build_devis_public(d, boutique, include_lignes=True)


@router.post("/devis", response_model=DevisPublic)
def create_devis(
    payload: DevisCreateRequest,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    if boutique.statut != models.BoutiqueStatut.ACTIF:
        raise HTTPException(
            status_code=403,
            detail="Cette boutique est inactive : création de nouveaux devis désactivée.",
        )

    if not payload.lignes:
        raise HTTPException(
            status_code=400,
            detail="Le devis doit contenir au moins une ligne",
        )

    max_num = (
        db.query(models.Devis.numero_boutique)
        .filter(models.Devis.boutique_id == boutique.id)
        .order_by(models.Devis.numero_boutique.desc())
        .first()
    )
    next_num = (max_num[0] + 1) if max_num else 1

    d = models.Devis(
        boutique_id=boutique.id,
        numero_boutique=next_num,
        statut=models.StatutDevis.EN_COURS,
        prix_total=0.0,
        configuration_json=json.dumps(payload.configuration)
        if payload.configuration is not None
        else None,
        dentelle_id=payload.dentelle_id,
    )

    db.add(d)
    db.flush()

    total = 0.0
    for ligne in payload.lignes:
        l = models.LigneDevis(
            devis_id=d.id,
            robe_modele_id=ligne.robe_modele_id,
            description=ligne.description or None,
            quantite=ligne.quantite,
            prix_unitaire=ligne.prix_unitaire,
        )
        db.add(l)
        total += ligne.quantite * ligne.prix_unitaire

    d.prix_total = total
    db.commit()
    db.refresh(d)

    return build_devis_public(d, boutique, include_lignes=True)


@router.put("/devis/{devis_id}", response_model=DevisPublic)
def update_devis(
    devis_id: int,
    payload: DevisCreateRequest,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Edition d'un devis existant (lignes + configuration + dentelle).

    On n'autorise l'édition que si le devis appartient à la boutique
    et qu'il n'est pas REFUSE ou ACCEPTE.
    """
    d = (
        db.query(models.Devis)
        .filter(models.Devis.id == devis_id, models.Devis.boutique_id == boutique.id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    if d.statut in (models.StatutDevis.ACCEPTE, models.StatutDevis.REFUSE):
        raise HTTPException(
            status_code=400,
            detail="Impossible de modifier un devis déjà accepté ou refusé.",
        )

    if not payload.lignes:
        raise HTTPException(
            status_code=400,
            detail="Le devis doit contenir au moins une ligne",
        )

    # Mise à jour configuration + dentelle
    d.configuration_json = (
        json.dumps(payload.configuration)
        if payload.configuration is not None
        else None
    )
    d.dentelle_id = payload.dentelle_id

    db.query(models.LigneDevis).filter(
        models.LigneDevis.devis_id == d.id
    ).delete()

    total = 0.0
    for ligne in payload.lignes:
        l = models.LigneDevis(
            devis_id=d.id,
            robe_modele_id=ligne.robe_modele_id,
            description=ligne.description or None,
            quantite=ligne.quantite,
            prix_unitaire=ligne.prix_unitaire,
        )
        db.add(l)
        total += ligne.quantite * ligne.prix_unitaire

    d.prix_total = total
    d.statut = models.StatutDevis.EN_COURS 
    db.commit()
    db.refresh(d)

    return build_devis_public(d, boutique, include_lignes=True)

# =========================
# Types de mesures
# =========================

@router.get("/mesures/types", response_model=List[MesureTypePublic])
def list_mesure_types(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    types = (
        db.query(models.MesureType)
        .order_by(models.MesureType.ordre, models.MesureType.id)
        .all()
    )
    return types

# =========================
# Mesures d'un devis (correction bon de commande)
# =========================

class UpdateDevisMesuresPayload(BaseModel):
    mesures: List[MesureValeurPayload]


@router.put("/devis/{devis_id}/mesures", response_model=DevisPublic)
def update_devis_mesures(
    devis_id: int,
    payload: UpdateDevisMesuresPayload,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Utilisé par la page de correction de bon de commande :
    - met à jour les mesures du devis
    - recalcule le montant du bon de commande
    - remet le bon en EN_ATTENTE_VALIDATION
    """

    devis = (
        db.query(models.Devis)
        .filter(
            models.Devis.id == devis_id,
            models.Devis.boutique_id == boutique.id,
        )
        .first()
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    # On remplace toutes les mesures
    devis.mesures.clear()
    db.flush()

    for m in payload.mesures:
        dm = models.DevisMesure(
            devis_id=devis.id,
            mesure_type_id=m.mesure_type_id,
            valeur=m.valeur,
        )
        db.add(dm)

    # Recalcul des montants pour le bon de commande
    prix = compute_prix_boutique_et_client(devis)
    has_tva = bool(boutique.numero_tva)

    montant_boutique_ht = prix["partenaire_ht"]
    montant_boutique_ttc = prix["partenaire_ttc"]

    bon = (
        db.query(models.BonCommande)
        .filter(models.BonCommande.devis_id == devis.id)
        .first()
    )

    if not bon:
        bon = models.BonCommande(
            devis_id=devis.id,
            montant_boutique_ht=montant_boutique_ht,
            montant_boutique_ttc=montant_boutique_ttc,
            has_tva=has_tva,
        )
        db.add(bon)
    else:
        bon.montant_boutique_ht = montant_boutique_ht
        bon.montant_boutique_ttc = montant_boutique_ttc
        bon.has_tva = has_tva

    # On remet le bon en attente de validation atelier
    if hasattr(models, "StatutBonCommande") and hasattr(bon, "statut"):
        bon.statut = models.StatutBonCommande.EN_ATTENTE_VALIDATION

    db.commit()
    db.refresh(devis)

    return build_devis_public(devis, boutique, include_lignes=True)


# =========================
# Changement de statut + bon de commande
# =========================

@router.post("/devis/{devis_id}/statut", response_model=DevisPublic)
def update_devis_statut(
    devis_id: int,
    payload: UpdateDevisStatutPayload,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    devis = (
        db.query(models.Devis)
        .filter(
            models.Devis.id == devis_id,
            models.Devis.boutique_id == boutique.id,
        )
        .first()
    )

    if not devis:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    if payload.statut == "ACCEPTE":
        if not payload.mesures or len(payload.mesures) == 0:
            raise HTTPException(
                status_code=400,
                detail="Les mesures sont obligatoires pour valider le devis.",
            )

        devis.mesures.clear()
        db.flush()

        for m in payload.mesures:
            dm = models.DevisMesure(
                devis_id=devis.id,
                mesure_type_id=m.mesure_type_id,
                valeur=m.valeur,
            )
            db.add(dm)

        devis.statut = models.StatutDevis.ACCEPTE

        prix = compute_prix_boutique_et_client(devis)
        has_tva = bool(boutique.numero_tva)

        montant_boutique_ht = prix["partenaire_ht"]
        montant_boutique_ttc = prix["partenaire_ttc"]

        bon = (
            db.query(models.BonCommande)
            .filter(models.BonCommande.devis_id == devis.id)
            .first()
        )
        if not bon:
            bon = models.BonCommande(
                devis_id=devis.id,
                montant_boutique_ht=montant_boutique_ht,
                montant_boutique_ttc=montant_boutique_ttc,
                has_tva=has_tva,
            )
            db.add(bon)
        else:
            bon.montant_boutique_ht = montant_boutique_ht
            bon.montant_boutique_ttc = montant_boutique_ttc
            bon.has_tva = has_tva

        if hasattr(models, "StatutBonCommande") and hasattr(bon, "statut"):
            bon.statut = models.StatutBonCommande.EN_ATTENTE_VALIDATION

        db.commit()
        db.refresh(devis)
        return build_devis_public(devis, boutique, include_lignes=True)


    if payload.statut == "REFUSE":
        devis.statut = models.StatutDevis.REFUSE
        db.commit()
        db.refresh(devis)
        return build_devis_public(devis, boutique, include_lignes=True)

    devis.statut = models.StatutDevis.EN_COURS
    db.commit()
    db.refresh(devis)
    return build_devis_public(devis, boutique, include_lignes=True)


@router.get("/bons-commande", response_model=List[BonCommandePublic])
def list_bons_commande(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    bons = (
        db.query(models.BonCommande)
        .join(models.Devis)
        .filter(models.Devis.boutique_id == boutique.id)
        .order_by(models.BonCommande.date_creation.desc())
        .all()
    )

    result: List[BonCommandePublic] = []

    for bc in bons:
        result.append(
            BonCommandePublic(
                id=bc.id,
                devis_id=bc.devis_id,
                numero_devis=bc.devis.numero_boutique,
                date_creation=bc.date_creation,
                montant_boutique_ht=bc.montant_boutique_ht,
                montant_boutique_ttc=bc.montant_boutique_ttc,
                has_tva=bc.has_tva,
                statut=bc.statut.value
                if hasattr(bc.statut, "value")
                else str(bc.statut),
                commentaire_admin=bc.commentaire_admin,
            )
        )

    return result

@router.get("/devis/{devis_id}/pdf")
def get_devis_pdf(
    devis_id: int,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    devis = (
        db.query(models.Devis)
        .filter(
            models.Devis.id == devis_id,
            models.Devis.boutique_id == boutique.id,
        )
        .first()
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    lignes = db.query(models.LigneDevis).filter(
        models.LigneDevis.devis_id == devis.id
    ).all()

    prix = compute_prix_boutique_et_client(devis)

    return generate_pdf_devis_bon(
        devis=devis,
        boutique=boutique,
        prix=prix,
        lignes=lignes,
        type="devis",
    )


# =========================
# PDF Bon de commande
# =========================


@router.get("/bons-commande/{devis_id}/pdf")
def get_bon_commande_pdf(
    devis_id: int,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    devis = (
        db.query(models.Devis)
        .filter(
            models.Devis.id == devis_id,
            models.Devis.boutique_id == boutique.id,
        )
        .first()
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Bon de commande introuvable")

    lignes = db.query(models.LigneDevis).filter(
        models.LigneDevis.devis_id == devis.id
    ).all()

    mesures = db.query(models.DevisMesure).filter(
        models.DevisMesure.devis_id == devis.id
    ).all()

    prix = compute_prix_boutique_et_client(devis)

    return generate_pdf_devis_bon(
        devis=devis,
        boutique=boutique,
        prix=prix,
        lignes=lignes,
        mesures=mesures,
        type="bon",
    )
