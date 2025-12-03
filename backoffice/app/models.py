
from datetime import datetime
from enum import Enum
from sqlalchemy import (
    Column, Integer, String, DateTime, Float,
    Enum as SAEnum, ForeignKey, Text, Boolean, func
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
    numero_tva = Column(String(64), nullable=True)
    statut = Column(SAEnum(BoutiqueStatut), nullable=False, default=BoutiqueStatut.ACTIF)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)

    mot_de_passe_hash = Column(String, nullable=True)
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
    numero_boutique = Column(Integer, nullable=False)
    statut = Column(SAEnum(StatutDevis), default=StatutDevis.EN_COURS, nullable=False)
    date_creation = Column(DateTime, default=datetime.utcnow, nullable=False)
    prix_total = Column(Float, default=0.0, nullable=False)

    boutique = relationship("Boutique", back_populates="devis")
    lignes = relationship("LigneDevis", back_populates="devis", cascade="all, delete-orphan")
    mesures = relationship("DevisMesure", back_populates="devis", cascade="all, delete-orphan")
    bon_commande = relationship("BonCommande", back_populates="devis", uselist=False)

class BonCommande(Base):
    __tablename__ = "bons_commandes"

    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id"), unique=True, nullable=False)

    date_creation = Column(DateTime, server_default=func.now(), nullable=False)

    montant_boutique_ht = Column(Float, nullable=False)
    montant_boutique_ttc = Column(Float, nullable=False)
    has_tva = Column(Boolean, default=False, nullable=False)

    devis = relationship("Devis", back_populates="bon_commande")


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
    robe_modele_id = Column(Integer, ForeignKey("robe_modeles.id"), nullable=True)
    description = Column(Text, nullable=True) 
    quantite = Column(Integer, default=1, nullable=False)
    prix_unitaire = Column(Float, default=0.0, nullable=False)

    devis = relationship("Devis", back_populates="lignes")
    robe_modele = relationship("RobeModele", back_populates="lignes")


class TransformationTarif(Base):
    """Tarifs des transformations / constructions (décolletés, découpes, manches, bas, ceinture...)."""
    __tablename__ = "tarifs_transformations"

    id = Column(Integer, primary_key=True, index=True)
    categorie = Column(String, nullable=False) 
    finition = Column(String, nullable=True)    
    robe_modele_id = Column(Integer, ForeignKey("robe_modeles.id"), nullable=True)
    epaisseur_ou_option = Column(String, nullable=True)  
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


class MesureType(Base):
    """
    Types de mesures possibles (tour de poitrine, taille, bassin, etc.),
    configurable par l'admin.
    """
    __tablename__ = "mesure_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, nullable=False)  # ex: "tour_poitrine"
    label = Column(String, nullable=False)              # ex: "Tour de poitrine"
    obligatoire = Column(Boolean, default=True, nullable=False)
    ordre = Column(Integer, default=0, nullable=False)


class DevisMesure(Base):
    """
    Valeur d'une mesure pour un devis donné.
    """
    __tablename__ = "devis_mesures"

    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id", ondelete="CASCADE"), nullable=False)
    mesure_type_id = Column(Integer, ForeignKey("mesure_types.id"), nullable=False)
    valeur = Column(Float, nullable=True)  # tu peux passer en String si tu veux des valeurs plus libres

    devis = relationship("Devis", back_populates="mesures")
    mesure_type = relationship("MesureType")
