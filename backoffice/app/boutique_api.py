import os
from typing import List, Optional, Literal

from fastapi import APIRouter, Depends, HTTPException, Header, Cookie, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from .database import SessionLocal
from . import models
from .auth import verify_password, get_password_hash

from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from io import BytesIO


router = APIRouter(prefix="/api/boutique", tags=["Boutique API"])

# IMPORTANT : à modifier
SECRET_KEY = "CHANGE_ME_SECRET_KEY"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
TVA_RATE = 0.20
MARGE_BOUTIQUE = 2.5 
MARGE_CREATRICE = 1.6


def get_serializer():
    return URLSafeTimedSerializer(SECRET_KEY, salt="boutique-auth")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



class BoutiquePublic(BaseModel):
    id: int
    nom: str
    email: EmailStr
    doit_changer_mdp: bool

    model_config = {
        "from_attributes": True
    }


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


class LigneDevisPublic(BaseModel):
    id: int
    robe_modele_id: Optional[int] = None
    description: Optional[str]
    quantite: int
    prix_unitaire: float

    model_config = {
        "from_attributes": True
    }

class DevisPublic(BaseModel):
    id: int
    numero_boutique: int
    statut: str
    date_creation: Optional[str]
    prix_total: float
    lignes: Optional[List[LigneDevisPublic]] = None

    model_config = {
        "from_attributes": True
    }

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


# ========= Auth boutique (token) =========

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



# ========= Endpoints =========

@router.post("/login", response_model=LoginResponse)
def login_boutique(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Login boutique : email + mot de passe -> pose un cookie HttpOnly + retourne les infos boutique.
    """
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
        secure=False,          
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
    """
    Retourne les infos de la boutique connectée.
    """
    return BoutiquePublic(
        id=boutique.id,
        nom=boutique.nom,
        email=boutique.email,
        doit_changer_mdp=boutique.doit_changer_mdp,
    )


@router.post("/change_password")
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Permet à la boutique de changer son mot de passe.
    """
    if not verify_password(payload.old_password, boutique.mot_de_passe_hash or ""):
        raise HTTPException(status_code=400, detail="Ancien mot de passe incorrect")

    boutique.mot_de_passe_hash = get_password_hash(payload.new_password)
    boutique.doit_changer_mdp = False
    db.commit()
    return {"ok": True}


@router.get("/options")
def get_options(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Retourne toutes les options nécessaires pour construire un devis
    côté front : modèles, tarifs transformations, tissus, finitions, accessoires.
    """
    modeles = db.query(models.RobeModele).filter_by(actif=True).all()
    transfos = db.query(models.TransformationTarif).all()
    tissus = db.query(models.TissuTarif).all()
    finitions = db.query(models.FinitionSupplementaire).all()
    accessoires = db.query(models.Accessoire).all()

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
            }
            for t in tissus
        ],
        "finitions_supplementaires": [
            {"id": f.id, "nom": f.nom, "prix": f.prix}
            for f in finitions
        ],
        "accessoires": [
            {"id": a.id, "nom": a.nom, "description": a.description, "prix": a.prix}
            for a in accessoires
        ],
    }


@router.get("/devis", response_model=List[DevisPublic])
def list_devis(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Liste les devis de la boutique (sans les lignes détaillées).
    """
    devis_list = (
        db.query(models.Devis)
        .filter(models.Devis.boutique_id == boutique.id)
        .order_by(models.Devis.date_creation.desc())
        .all()
    )
    result = []
    for d in devis_list:
        result.append(
            DevisPublic(
                id=d.id,
                numero_boutique=d.numero_boutique,
                statut=d.statut.value,
                date_creation=d.date_creation.isoformat() if d.date_creation else None,
                prix_total=d.prix_total,
                lignes=None,
            )
        )
    return result


@router.get("/devis/{devis_id}", response_model=DevisPublic)
def get_devis_detail(
    devis_id: int,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Détails d'un devis (avec lignes), uniquement si il appartient à la boutique.
    """
    d = (
        db.query(models.Devis)
        .filter(models.Devis.id == devis_id, models.Devis.boutique_id == boutique.id)
        .first()
    )
    if not d:
        raise HTTPException(status_code=404, detail="Devis introuvable")

    lignes_public = [
        LigneDevisPublic(
            id=l.id,
            robe_modele_id=l.robe_modele_id,
            description=l.description,
            quantite=l.quantite,
            prix_unitaire=l.prix_unitaire,
        )
        for l in d.lignes
    ]

    return DevisPublic(
        id=d.id,
        numero_boutique=d.numero_boutique,
        statut=d.statut.value,
        date_creation=d.date_creation.isoformat() if d.date_creation else None,
        prix_total=d.prix_total,
        lignes=lignes_public,
    )


@router.post("/devis", response_model=DevisPublic)
def create_devis(
    payload: DevisCreateRequest,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Création d'un devis pour la boutique connectée.

    Le front envoie les lignes (robe_modele_id, description, quantite, prix_unitaire).
    Le back calcule:
      - le nouveau numero_boutique (Paris-#N)
      - le prix_total
    """
    if boutique.statut != models.BoutiqueStatut.ACTIF:
        raise HTTPException(
            status_code=403,
            detail="Cette boutique est inactive : création de nouveaux devis désactivée."
        )
    
    if not payload.lignes:
        raise HTTPException(status_code=400, detail="Le devis doit contenir au moins une ligne")

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
    )
    db.add(d)
    db.flush() 

    total = 0.0
    lignes_objs = []
    for ligne in payload.lignes:
        l = models.LigneDevis(
            devis_id=d.id,
            robe_modele_id=ligne.robe_modele_id,
            description=ligne.description or None,
            quantite=ligne.quantite,
            prix_unitaire=ligne.prix_unitaire,
        )
        db.add(l)
        lignes_objs.append(l)
        total += ligne.quantite * ligne.prix_unitaire

    d.prix_total = total
    db.commit()
    db.refresh(d)

    lignes_public = [
        LigneDevisPublic(
            id=l.id,
            robe_modele_id=l.robe_modele_id,
            description=l.description,
            quantite=l.quantite,
            prix_unitaire=l.prix_unitaire,
        )
        for l in lignes_objs
    ]

    return DevisPublic(
        id=d.id,
        numero_boutique=d.numero_boutique,
        statut=d.statut.value,
        date_creation=d.date_creation.isoformat() if d.date_creation else None,
        prix_total=d.prix_total,
        lignes=lignes_public,
    )

@router.post("/logout")
def logout_boutique(response: Response):
    """
    Déconnexion boutique : on efface le cookie.
    """
    response.delete_cookie(
        key="b2b_token",
        path="/",
    )
    return {"ok": True}


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

    lignes = (
        db.query(models.LigneDevis)
        .filter(models.LigneDevis.devis_id == devis.id)
        .all()
    )

    # -----------------------------------------
    # LOGIQUE PRIX
    # -----------------------------------------
    has_tva = bool(boutique.numero_tva)
    base_ht = devis.prix_total * MARGE_CREATRICE

    # Prix boutique HT ou TTC
    if has_tva:
        prix_boutique_unitaire = base_ht
        prix_boutique_total = base_ht
        etiquette_boutique = "Prix boutique (HT)"
    else:
        prix_boutique_unitaire = base_ht * (1 + TVA_RATE)
        prix_boutique_total = prix_boutique_unitaire
        etiquette_boutique = "Prix boutique (TTC)"

    # Prix client conseillé
    prix_client_ht = base_ht * MARGE_BOUTIQUE
    prix_client_ttc = prix_client_ht * (1 + TVA_RATE)

    montant_tva_client = prix_client_ttc - prix_client_ht

    # -----------------------------------------
    # GÉNÉRATION DU PDF
    # -----------------------------------------
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50

    # -----------------------------------------
    # LOGO
    # -----------------------------------------
    logo_path = os.path.join("app", "static", "logo_bande.png")

    if os.path.exists(logo_path):
        # Ajuster largeur / hauteur selon ton image
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

    # -----------------------------------------
    # ENTÊTE (infos Constance)
    # -----------------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SARL Cellier Constance")
    y -= 14
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "835 144 866")
    y -= 14
    c.drawString(50, y, "3, rue Maryse Bastié – 59840 Pérenchies")
    y -= 24

    # Date devis
    if devis.date_creation:
        c.drawString(50, y, f"Date : {devis.date_creation.strftime('%d/%m/%Y')}")
    else:
        c.drawString(50, y, "Date : -")
    y -= 14

    # Référence devis
    ref_devis = f"{boutique.nom}-{devis.numero_boutique}"
    c.drawString(50, y, f"Devis n° : {ref_devis}")
    y -= 30

    # -----------------------------------------
    # TITRE
    # -----------------------------------------
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(width / 2, y, "DEVIS")
    y -= 40

    # -----------------------------------------
    # BLOC BOUTIQUE
    # -----------------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Boutique :")
    y -= 16

    c.setFont("Helvetica", 10)
    c.drawString(60, y, f"Nom : {boutique.nom}")
    y -= 14
    if boutique.adresse:
        c.drawString(60, y, f"Adresse : {boutique.adresse}")
        y -= 14
    if boutique.telephone:
        c.drawString(60, y, f"Téléphone : {boutique.telephone}")
        y -= 14
    if boutique.email:
        c.drawString(60, y, f"Email : {boutique.email}")
        y -= 14
    if boutique.numero_tva:
        c.drawString(60, y, f"Numéro de TVA : {boutique.numero_tva}")
        y -= 14
    else:
        c.drawString(60, y, "Numéro de TVA : non renseigné")
        y -= 14

    y -= 20
    c.line(50, y, width - 50, y)
    y -= 20

    # -----------------------------------------
    # TABLEAU PRINCIPAL
    # -----------------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Détail de la commande")
    y -= 18

    # En-tête
    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Description")
    c.drawString(300, y, "Quantité")
    c.drawString(360, y, "Prix unitaire")
    c.drawString(450, y, "Total")
    y -= 14

    c.line(50, y, width - 50, y)
    y -= 14

    c.setFont("Helvetica", 10)

    for ligne in lignes:
        if y < 100:  # nouvelle page si trop bas
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 10)

        desc = ligne.description or "Robe de mariée sur-mesure"
        quantite = ligne.quantite or 1

        c.drawString(50, y, desc[:60])
        c.drawString(305, y, str(quantite))
        c.drawRightString(420, y, f"{prix_boutique_unitaire:.2f} €")
        c.drawRightString(540, y, f"{prix_boutique_total:.2f} €")
        y -= 16

    y -= 10
    c.line(50, y, width - 50, y)
    y -= 22

    # -----------------------------------------
    # RÉCAP DES MONTANTS
    # -----------------------------------------
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Récapitulatif des montants")
    y -= 18

    c.setFont("Helvetica", 10)

    # Prix boutique
    c.drawString(60, y, f"{etiquette_boutique} :")
    c.drawRightString(540, y, f"{prix_boutique_total:.2f} €")
    y -= 14

    # Prix client conseillé HT si TVA renseignée
    if has_tva:
        c.drawString(60, y, "Prix client conseillé (HT) :")
        c.drawRightString(540, y, f"{prix_client_ht:.2f} €")
        y -= 14

    # Prix client TTC conseillé
    c.drawString(60, y, "Prix client conseillé (TTC) :")
    c.drawRightString(540, y, f"{prix_client_ttc:.2f} €")
    y -= 14

    if has_tva:
        c.drawString(60, y, "Montant TVA (20%) sur prix client :")
        c.drawRightString(540, y, f"{montant_tva_client:.2f} €")
        y -= 22

    # -----------------------------------------
    # MENTIONS
    # -----------------------------------------
    c.setFont("Helvetica", 9)
    c.drawString(50, y, "Devis valable 20 jours à compter de sa date d’émission.")
    y -= 12
    c.drawString(50, y, "Tout acompte, une fois versé, ne pourra être restitué.")
    y -= 12
    c.drawString(
        50,
        y,
        "Conditions générales de vente : www.constancecellier.fr/cgv",
    )

    # -----------------------------------------
    # FINALISATION
    # -----------------------------------------
    c.showPage()
    c.save()
    buffer.seek(0)

    filename = f"devis_{ref_devis}.pdf".replace(" ", "_")
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename=\"{filename}\"'},
    )

@router.get("/devis/{devis_id}/bon-commande.pdf")
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
        raise HTTPException(status_code=404, detail="Devis introuvable")

    if devis.statut != models.StatutDevis.ACCEPTE:
        raise HTTPException(
            status_code=400,
            detail="Le bon de commande n'est disponible que pour les devis acceptés."
        )

    # calcul du prix facturé à la boutique (tu peux reprendre la même logique que dans get_devis_pdf)
    TVA_RATE = 0.20
    has_tva = bool(boutique.numero_tva)
    base_ht = devis.prix_total  # ton prix interne HT

    if has_tva:
        prix_boutique_total = base_ht
        etiquette_boutique = "Prix facturé à la boutique (HT)"
    else:
        prix_boutique_total = base_ht * (1 + TVA_RATE)
        etiquette_boutique = "Prix facturé à la boutique (TTC)"

    # Génération PDF (très simplifiée pour l’exemple)
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 50

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, y, "Bon de commande")
    y -= 24

    c.setFont("Helvetica", 10)
    c.drawString(50, y, f"Boutique : {boutique.nom}")
    y -= 14
    c.drawString(50, y, f"Devis n° {devis.numero_boutique} (id interne {devis.id})")
    y -= 24

    # prix facturé à la boutique
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, etiquette_boutique + f" : {prix_boutique_total:.2f} €")
    y -= 24

    # bloc mesures
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Mesures :")
    y -= 18
    c.setFont("Helvetica", 10)

    for dm in devis.mesures:
        label = dm.mesure_type.label if dm.mesure_type else f"Mesure #{dm.mesure_type_id}"
        c.drawString(60, y, f"- {label}: {dm.valeur:.1f} cm")
        y -= 14
        if y < 80:
            c.showPage()
            y = height - 50
            c.setFont("Helvetica", 10)

    c.showPage()
    c.save()
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="bon_commande_devis_{devis.id}.pdf"'
        },
    )

@router.get("/mesures/types", response_model=List[MesureTypePublic])
def list_mesure_types(
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Retourne la liste des types de mesures configurés (tour de poitrine, taille, etc.)
    visible par une boutique connectée.
    """
    types = (
        db.query(models.MesureType)
        .order_by(models.MesureType.ordre, models.MesureType.id)
        .all()
    )
    return types

@router.post("/devis/{devis_id}/statut", response_model=DevisPublic)
def update_devis_statut(
    devis_id: int,
    payload: UpdateDevisStatutPayload,
    db: Session = Depends(get_db),
    boutique: models.Boutique = Depends(get_current_boutique),
):
    """
    Permet à une boutique de changer le statut d'un devis :
    - EN_COURS
    - ACCEPTE (avec mesures obligatoires)
    - REFUSE

    Si le statut passe à ACCEPTE, on enregistre / remplace les mesures.
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

    if payload.statut == "ACCEPTE":
        if not payload.mesures or len(payload.mesures) == 0:
            raise HTTPException(
                status_code=400,
                detail="Les mesures sont obligatoires pour accepter un devis.",
            )

        devis.mesures.clear()

        for m in payload.mesures:
            mesure_type = (
                db.query(models.MesureType)
                .filter(models.MesureType.id == m.mesure_type_id)
                .first()
            )
            if not mesure_type:
                continue

            devis.mesures.append(
                models.DevisMesure(
                    mesure_type_id=mesure_type.id,
                    valeur=m.valeur,
                )
            )

    # Mise à jour du statut (EN_COURS, ACCEPTE, REFUSE)
    try:
        devis.statut = models.StatutDevis(payload.statut)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Statut invalide.",
        )

    db.add(devis)
    db.commit()
    db.refresh(devis)
    return devis

