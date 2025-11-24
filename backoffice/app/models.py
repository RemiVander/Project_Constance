
from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, DateTime, Float,
    Enum as SAEnum, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship

from .database import Base


class UserType(str, Enum):
    ADMIN = "admin"


class User(Base):
    """Compte admin (back-office)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mot_de_passe = Column(String, nullable=False)
    type = Column(SAEnum(UserType), nullable=False, default=UserType.ADMIN)


class BoutiqueStatut(str, Enum):
    ACTIF = "ACTIF"
    INACTIF = "INACTIF"
    SUSPENDU = "SUSPENDU"


class Boutique(Base):
    """Boutique partenaire (compte futur pour le front B2B)."""
    __tablename__ = "boutiques"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    gerant = Column(String, nullable=True)
    telephone = Column(String, nullable=True)
    adresse = Column(Text, nullable=True)
    statut = Column(SAEnum(BoutiqueStatut), nullable=False, default=BoutiqueStatut.ACTIF)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    mot_de_passe_hash = Column(String, nullable=True)  # pour futur front boutique
    doit_changer_mdp = Column(Boolean, default=True, nullable=False)

    devis = relationship("Devis", back_populates="boutique")


class StatutDevis(str, Enum):
    EN_COURS = "EN_COURS"
    ACCEPTE = "ACCEPTE"
    REFUSE = "REFUSE"


class Devis(Base):
    """Devis global pour une boutique (plusieurs lignes / robes possibles)."""
    __tablename__ = "devis"

    id = Column(Integer, primary_key=True, index=True)
    boutique_id = Column(Integer, ForeignKey("boutiques.id"), nullable=False)
    # Numéro propre à la boutique (Paris-#1, Paris-#2, Lyon-#1, etc.).
    numero_boutique = Column(Integer, nullable=False)
    statut = Column(SAEnum(StatutDevis), default=StatutDevis.EN_COURS, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    prix_total = Column(Float, default=0.0, nullable=False)

    boutique = relationship("Boutique", back_populates="devis")
    lignes = relationship("LigneDevis", back_populates="devis", cascade="all, delete-orphan")


class RobeModele(Base):
    """Catalogue des modèles de robes (Alizé, Bora, Eurus, etc.)."""
    __tablename__ = "robe_modeles"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, unique=True, nullable=False)
    description = Column(Text, nullable=True)
    actif = Column(Boolean, default=True, nullable=False)

    lignes = relationship("LigneDevis", back_populates="robe_modele")
    tarifs_transformations = relationship("TransformationTarif", back_populates="robe_modele")
    tarifs_tissus = relationship("TissuTarif", back_populates="robe_modele")


class LigneDevis(Base):
    """Ligne de devis : une robe (modèle) éventuellement personnalisée."""
    __tablename__ = "lignes_devis"

    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id"), nullable=False)
    robe_modele_id = Column(Integer, ForeignKey("robe_modeles.id"), nullable=False)
    description = Column(Text, nullable=True)  # description libre / configuration choisie
    quantite = Column(Integer, default=1, nullable=False)
    prix_unitaire = Column(Float, default=0.0, nullable=False)

    devis = relationship("Devis", back_populates="lignes")
    robe_modele = relationship("RobeModele", back_populates="lignes")


class TransformationTarif(Base):
    """Tarifs des transformations / constructions (décolletés, découpes, manches, bas, ceinture...)."""
    __tablename__ = "tarifs_transformations"

    id = Column(Integer, primary_key=True, index=True)
    categorie = Column(String, nullable=False)  # ex: Décolleté devant, Bas, Manches, Découpe devant...
    finition = Column(String, nullable=True)    # ex: Rond, Petit V, Forme U, Évasée...
    robe_modele_id = Column(Integer, ForeignKey("robe_modeles.id"), nullable=True)
    epaisseur_ou_option = Column(String, nullable=True)  # ex: "2 épaisseurs", "Boléro", "Robe 3 et 6"
    prix = Column(Float, default=0.0, nullable=False)

    # Booléens métier:
    # - est_decollete : concerne uniquement Décolleté devant / Décolleté dos
    # - ceinture_possible : concerne uniquement Découpe devant (sinon implicitement True)
    est_decollete = Column(Boolean, default=False, nullable=False)
    ceinture_possible = Column(Boolean, default=True, nullable=False)

    robe_modele = relationship("RobeModele", back_populates="tarifs_transformations")


class TissuTarif(Base):
    """Tarifs des matières / tissus par zone (devant, dos, manches, bas, ceinture...)."""
    __tablename__ = "tarifs_tissus"

    id = Column(Integer, primary_key=True, index=True)
    categorie = Column(String, nullable=False)  # ex: devant, Dos, Manches, Ceinture, Bas
    robe_modele_id = Column(Integer, ForeignKey("robe_modeles.id"), nullable=True)
    detail = Column(Text, nullable=False)       # ex: Dentelle 1 épaisseur...
    forme = Column(String, nullable=True)       # ex: évasée, 30 degrés, Fourreau...
    prix = Column(Float, default=0.0, nullable=False)

    robe_modele = relationship("RobeModele", back_populates="tarifs_tissus")


class FinitionSupplementaire(Base):
    """Finitions supplémentaires globales (fente, quille de dentelle...)."""
    __tablename__ = "finitions_supplementaires"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prix = Column(Float, default=0.0, nullable=False)


class Accessoire(Base):
    """Accessoires (housse de protection, etc.)."""
    __tablename__ = "accessoires"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    prix = Column(Float, default=0.0, nullable=False)
