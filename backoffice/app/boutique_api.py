from datetime import datetime
import json
import os
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Header, Cookie, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

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
    lignes: Optional[List[LigneDevisPublic]] = None

    model_config = {"from_attributes": True}


class MesureTypePublic(BaseModel):
    id: int
    code: str
    label: str
    obligatoire: bool
    ordre: int

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
    devis = (
        db.query(models.Devis)
        .filter(models.Devis.id == devis_id, models.Devis.boutique_id == boutique.id)
        .first()
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    if devis.statut == models.StatutDevis.ACCEPTE:
        raise HTTPException(
            status_code=400,
            detail="Impossible de modifier un devis déjà accepté.",
        )

    if not payload.lignes:
        raise HTTPException(
            status_code=400,
            detail="Le devis doit contenir au moins une ligne",
        )

    devis.lignes.clear()
    db.flush()

    total = 0.0
    for ligne in payload.lignes:
        l = models.LigneDevis(
            devis_id=devis.id,
            robe_modele_id=ligne.robe_modele_id,
            description=ligne.description or None,
            quantite=ligne.quantite,
            prix_unitaire=ligne.prix_unitaire,
        )
        db.add(l)
        total += ligne.quantite * ligne.prix_unitaire

    devis.prix_total = total
    devis.configuration_json = (
        json.dumps(payload.configuration)
        if payload.configuration is not None
        else None
    )
    devis.dentelle_id = payload.dentelle_id
    devis.statut = models.StatutDevis.EN_COURS

    db.commit()
    db.refresh(devis)

    return build_devis_public(devis, boutique, include_lignes=True)


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

    # On charge les lignes explicitement (comme dans ton ancienne version)
    lignes = (
        db.query(models.LigneDevis)
        .filter(models.LigneDevis.devis_id == devis.id)
        .all()
    )

    # Calcul des montants avec la nouvelle logique (compute_prix_boutique_et_client)
    prix = compute_prix_boutique_et_client(devis)
    has_tva = bool(boutique.numero_tva)

    partenaire_ht = prix["partenaire_ht"]
    partenaire_tva = prix["partenaire_tva"]
    partenaire_ttc = prix["partenaire_ttc"]
    client_ht = prix["client_ht"]
    client_tva = prix["client_tva"]
    client_ttc = prix["client_ttc"]

    montant_a_payer = partenaire_ht if has_tva else partenaire_ttc
    label_montant = (
        "Montant à payer par la boutique (HT)"
        if has_tva
        else "Montant à payer par la boutique (TTC)"
    )

    # ========== GÉNÉRATION DU PDF ==========
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50

    # LOGO
    logo_path = os.path.join("app", "static", "logo_bande.png")
    if os.path.exists(logo_path):
        c.drawImage(
            logo_path,
            50,
            height - 120,
            width=350,
            height=70,
            preserveAspectRatio=True,
            mask="auto",
        )
        y = height - 150
    else:
        y = height - 50

    # ENTÊTE CONSTANCE
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SARL Cellier Constance")
    y -= 14
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Siren : 992 306 373")
    y -= 14
    c.drawString(50, y, "3, rue Maryse Bastié – 59840 Pérenchies")
    y -= 24

    # Date
    if devis.date_creation:
        c.drawString(50, y, f"Date : {devis.date_creation.strftime('%d/%m/%Y')}")
    else:
        c.drawString(50, y, "Date : -")
    y -= 14

    # Référence devis
    ref_devis = f"{boutique.nom}-{devis.numero_boutique}"
    c.drawString(50, y, f"Devis n° : {ref_devis}")
    y -= 30

    # TITRE
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, y, "Devis création robe de mariée")
    y -= 24

    # Bloc boutique
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Boutique partenaire :")
    y -= 14

    c.setFont("Helvetica", 10)
    c.drawString(60, y, f"{boutique.nom}")
    y -= 14
    if boutique.numero_tva:
        c.drawString(60, y, f"N° TVA : {boutique.numero_tva}")
        y -= 14
    if boutique.adresse:
        c.drawString(60, y, boutique.adresse)
        y -= 14

    # Dentelle (si choisie)
    if getattr(devis, "dentelle", None):
        c.drawString(60, y, f"Dentelle : {devis.dentelle.nom}")
        y -= 14

    y -= 10

    # Tableau des lignes
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Détail de la création")
    y -= 18

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Description")
    c.drawRightString(540, y, "Qté")
    y -= 12
    c.line(50, y, width - 50, y)
    y -= 14

    c.setFont("Helvetica", 10)
    for ligne in lignes:
        desc = ligne.description or "Robe de mariée sur-mesure"
        quantite = ligne.quantite or 1

        wrapped_lines = textwrap.wrap(desc, width=95)

        for i, line in enumerate(wrapped_lines):
            if y < 80:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)

            c.drawString(50, y, line)
            # Qté uniquement sur la première ligne
            if i == 0:
                c.drawRightString(540, y, str(quantite))
            y -= 16

    y -= 10
    c.line(50, y, width - 50, y)
    y -= 22

    # RÉCAP MONTANTS
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Récapitulatif des montants")
    y -= 18

    c.setFont("Helvetica", 10)

    c.drawString(60, y, "Montant HT :")
    c.drawRightString(540, y, f"{partenaire_ht:.2f} €")
    y -= 14

    c.drawString(60, y, "TVA (20 %) :")
    c.drawRightString(540, y, f"{partenaire_tva:.2f} €")
    y -= 14

    c.drawString(60, y, "Montant TTC :")
    c.drawRightString(540, y, f"{partenaire_ttc:.2f} €")
    y -= 18

    c.setFont("Helvetica-Bold", 10)
    c.drawString(60, y, label_montant + " :")
    c.drawRightString(540, y, f"{montant_a_payer:.2f} €")
    y -= 24

    # Prix client conseillé
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Prix client conseillé :")
    y -= 18

    c.setFont("Helvetica", 10)
    c.drawString(60, y, "Montant HT conseillé au client :")
    c.drawRightString(540, y, f"{client_ht:.2f} €")
    y -= 14

    c.drawString(60, y, "TVA (20 %) sur prix client :")
    c.drawRightString(540, y, f"{client_tva:.2f} €")
    y -= 14

    c.drawString(60, y, "Montant TTC conseillé au client :")
    c.drawRightString(540, y, f"{client_ttc:.2f} €")
    y -= 22

    # Mentions
    c.setFont("Helvetica", 9)
    c.drawString(50, y, "Devis valable 20 jours à compter de sa date d'émission.")
    y -= 12
    c.drawString(50, y, "Tout acompte, une fois versé, ne pourra être restitué.")
    y -= 12
    c.drawString(
        50,
        y,
        "Conditions générales de vente : www.constancecellier.fr/cgv",
    )

    c.showPage()
    c.save()
    buffer.seek(0)

    filename = f"devis_{ref_devis}.pdf".replace(" ", "_")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
