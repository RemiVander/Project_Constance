from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr


class BoutiquePublic(BaseModel):
    id: int
    nom: str
    email: EmailStr
    doit_changer_mdp: bool

    gerant: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    numero_tva: Optional[str] = None

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


class MesureValeurPublic(BaseModel):
    mesure_type_id: int
    valeur: float | None = None

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
    mesures: Optional[List[MesureValeurPublic]] = None

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


class BoutiqueProfileUpdate(BaseModel):
    nom: Optional[str] = None
    gerant: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    email: Optional[EmailStr] = None


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


class UpdateDevisMesuresPayload(BaseModel):
    mesures: List[MesureValeurPayload]
    commentaire_boutique: Optional[str] = None
