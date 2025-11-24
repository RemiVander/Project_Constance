# app/boutique_api.py

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Cookie, Response
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from .database import SessionLocal
from . import models
from .auth import verify_password, get_password_hash

router = APIRouter(prefix="/api/boutique", tags=["Boutique API"])

# IMPORTANT : à modifier
SECRET_KEY = "CHANGE_ME_SECRET_KEY"
TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7


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
    robe_modele_id: int
    description: Optional[str] = None
    quantite: int = 1
    prix_unitaire: float


class DevisCreateRequest(BaseModel):
    lignes: List[LigneDevisCreate]


class LigneDevisPublic(BaseModel):
    id: int
    robe_modele_id: int
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
        samesite="strict",
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
