# -*- coding: utf-8 -*-
from app.database import Base, engine, SessionLocal
from app import models
from app.auth import get_password_hash


ROBE_NAMES = [
    "Alizé",   # 1
    "Bora",    # 2
    "Eurus",   # 3
    "Ghibli",  # 4
    "Mistral", # 5
    "Zephyr",  # 6
]

MESURE_TYPES = [
    ("tour_poitrine", "Tour de poitrine"),
    ("tour_taille", "Tour de taille"),
    ("tour_bassin", "Tour de bassin"),
    ("tour_bras", "Tour de bras"),
    ("tour_main", "Tour de main"),
    ("carrure_dos", "Carrure dos"),
    ("carrure_devant", "Carrure devant"),
    ("ecartement_seins", "Écartement des seins"),
    ("hauteur_seins_point_encolure", "Hauteur seins / point d'encolure"),
    ("hauteur_seins_point_acromion", "Hauteur seins / point d'acromion"),
    ("hauteur_dessous_bras", "Hauteur dessous de bras"),
    ("hauteur_taille_bassin", "Hauteur taille / bassin"),
    ("hauteur_taille_genou", "Hauteur taille / genou"),
    ("hauteur_taille_sol", "Hauteur taille / sol"),
    ("longueur_taille_devant", "Longueur taille devant"),
    ("longueur_taille_dos", "Longueur taille dos"),
    ("longueur_epaule", "Longueur épaule"),
    ("longueur_bras", "Longueur du bras"),
    ("longueur_bras_coude", "Longueur bras / coude"),
]

DENTELLES_DEFAULT = [
    "Dentelle 1 (Alizée/Zéphyr)",
    "Dentelle 2 (Mistral)",
    "Dentelle 3 (Eurus)",
    "Dentelle 4 (Ghibli)",
]



def seed_mesure_types(db):
    if db.query(models.MesureType).count() > 0:
        return

    print("Création des types de mesures...")
    for ordre, (code, label) in enumerate(MESURE_TYPES, start=1):
        mt = models.MesureType(
            code=code,
            label=label,
            obligatoire=True,
            ordre=ordre,
        )
        db.add(mt)
    db.commit()


def get_modele_by_index(db, idx):
    # idx est 1-based
    name = ROBE_NAMES[idx - 1]
    return db.query(models.RobeModele).filter_by(nom=name).first()


def seed_robe_modeles(db):
    if db.query(models.RobeModele).count() > 0:
        return
    print("Création des modèles de robes...")
    for nom in ROBE_NAMES:
        db.add(models.RobeModele(nom=nom, actif=True))
    db.commit()


def seed_tarifs_transformations(db):
    if db.query(models.TransformationTarif).count() > 0:
        return
    print("Insertion des tarifs de transformations...")

    data = [
        # Catégories, Finitions, RobeIndex, Epaisseurs/option, Prix
        ("Décolleté devant", "Rond", 1, "2 épaisseurs", 30),
        ("Décolleté devant", "Rond", 5, "2 épaisseurs", 30),
        ("Décolleté devant", "Rond", 1, "3 épaisseurs", 40),
        ("Décolleté devant", "Rond", 5, "3 épaisseurs", 40),
        ("Décolleté devant", "Petit V", 2, "2 épaisseurs", 30),
        ("Décolleté devant", "Petit V", 2, "3 épaisseurs", 40),
        ("Décolleté devant", "Rond Boléro", 2, "Boléro", 20),
        ("Décolleté devant", "Moyen V", 3, "2 épaisseurs", 30),
        ("Décolleté devant", "Moyen V", 3, "3 épaisseurs", 40),
        ("Décolleté devant", "Grand V", 4, "2 épaisseurs", 30),
        ("Décolleté devant", "Grand V", 4, "3 épaisseurs", 40),
        ("Décolleté devant", "Effet Bustier", 6, "3 épaisseurs", 50),

        ("Décolleté dos", "Forme U", 1, "1 épaisseur", 20),
        ("Décolleté dos", "Forme U", 1, "2 épaisseurs", 30),
        ("Décolleté dos", "Forme U", 1, "3 épaisseurs", 40),
        ("Décolleté dos", "Forme V", 2, "1 épaisseur", 20),
        ("Décolleté dos", "Forme V", 6, "1 épaisseur", 20),
        ("Décolleté dos", "Forme V", 2, "2 épaisseurs", 30),
        ("Décolleté dos", "Forme V", 6, "2 épaisseurs", 30),
        ("Décolleté dos", "Forme V", 2, "3 épaisseurs", 40),
        ("Décolleté dos", "Forme V", 6, "3 épaisseurs", 40),
        ("Décolleté dos", "Fermé boléro", 2, "Boléro", 28),
        ("Décolleté dos", "Forme V inversé", 3, "1 épaisseur", 28),
        ("Décolleté dos", "Forme V inversé", 4, "1 épaisseur", 28),
        ("Décolleté dos", "Forme V inversé", 3, "2 épaisseurs", 38),
        ("Décolleté dos", "Forme V inversé", 4, "2 épaisseurs", 38),
        ("Décolleté dos", "Forme V inversé", 3, "3 épaisseurs", 48),
        ("Décolleté dos", "Forme V inversé", 4, "3 épaisseurs", 48),
        ("Décolleté dos", "Fermé", 5, "1 épaisseur", 60),
        ("Décolleté dos", "Fermé", 5, "2 épaisseurs", 70),
        ("Décolleté dos", "Fermé", 5, "3 épaisseurs", 80),

        ("Découpe devant", "Princesse", 1, "2 épaisseurs", 30),
        ("Découpe devant", "Princesse", 2, "2 épaisseurs", 30),
        ("Découpe devant", "Princesse", 1, "3 épaisseurs", 40),
        ("Découpe devant", "Princesse", 2, "3 épaisseurs", 40),
        ("Découpe devant", "Pince au côté et transformation boléro", 2, "Boléro", 20),
        ("Découpe devant", "Cumul de pince à la taille", 3, "2 épaisseurs", 30),
        ("Découpe devant", "Cumul de pince à la taille", 5, "2 épaisseurs", 30),
        ("Découpe devant", "Cumul de pince à la taille", 6, "2 épaisseurs", 30),
        ("Découpe devant", "Cumul de pince à la taille", 3, "3 épaisseurs", 40),
        ("Découpe devant", "Cumul de pince à la taille", 5, "3 épaisseurs", 40),
        ("Découpe devant", "Cumul de pince à la taille", 6, "3 épaisseurs", 40),
        ("Découpe devant", "Cumul de volume en fronce à la taille", 4, "2 épaisseurs", 30),
        ("Découpe devant", "Cumul de volume en fronce à la taille", 4, "3 épaisseurs", 40),

        ("Découpe dos", "Pince invisible en carrure", 1, "1 épaisseur", 20),
        ("Découpe dos", "Pince invisible en carrure", 3, "1 épaisseur", 20),
        ("Découpe dos", "Pince invisible en carrure", 4, "1 épaisseur", 20),
        ("Découpe dos", "Pince invisible en carrure", 1, "2 épaisseurs", 30),
        ("Découpe dos", "Pince invisible en carrure", 3, "2 épaisseurs", 30),
        ("Découpe dos", "Pince invisible en carrure", 4, "2 épaisseurs", 30),
        ("Découpe dos", "Pince invisible en carrure", 1, "3 épaisseurs", 40),
        ("Découpe dos", "Pince invisible en carrure", 3, "3 épaisseurs", 40),
        ("Découpe dos", "Pince invisible en carrure", 4, "3 épaisseurs", 40),
        ("Découpe dos", "Fermeture pince de cintrage", 2, "1 épaisseur", 20),
        ("Découpe dos", "Fermeture pince de cintrage", 6, "1 épaisseur", 20),
        ("Découpe dos", "Fermeture pince de cintrage", 2, "2 épaisseurs", 30),
        ("Découpe dos", "Fermeture pince de cintrage", 6, "2 épaisseurs", 30),
        ("Découpe dos", "Fermeture pince de cintrage", 2, "3 épaisseurs", 40),
        ("Découpe dos", "Fermeture pince de cintrage", 6, "3 épaisseurs", 40),
        ("Découpe dos", "Transformation boléro", 2, "Boléro", 20),
        ("Découpe dos", "Suppression de pinces cintrage", 5, "1 épaisseur", 20),
        ("Découpe dos", "Suppression de pinces cintrage", 5, "2 épaisseurs", 30),
        ("Découpe dos", "Suppression de pinces cintrage", 5, "3 épaisseurs", 40),

        ("Manches", "Tulipe", 1, "Alizé", 50),
        ("Manches", "Manchon", 3, "Eurus", 20),
        ("Manches", "Manchon", 6, "Zephyr", 20),
        ("Manches", "Trois quarts", 4, "Ghibli", 30),
        ("Manches", "Longue", 5, "Mistral", 40),

        ("Ceinture", "/", None, "Dentelle en transparence", 19),
        ("Découpe taille devant et dos", "/", None, "Remonté devant", 40),
        ("Découpe taille devant et dos", "/", None, "Échancré dos", 40),

        ("Bas", "Évasée", 1, "2 épaisseurs", 150),
        ("Bas", "Évasée", 3, "2 épaisseurs", 150),
        ("Bas", "Évasée", 6, "2 épaisseurs", 150),
        ("Bas", "Évasée avec fronces", 1, "3 épaisseurs", 240),
        ("Bas", "Évasée avec fronces", 3, "3 épaisseurs", 240),
        ("Bas", "Évasée avec fronces", 6, "3 épaisseurs", 240),
        ("Bas", "30°", 2, "2 épaisseurs", 150),
        ("Bas", "30° avec fronces", 2, "3 épaisseurs", 240),
        ("Bas", "Fourreau", 4, "Ghibli", 150),
        ("Bas", "Droite", 5, "Mistral", 150),
    ]

    for categorie, finition, robe_idx, ep_opt, prix in data:
        robe_modele = get_modele_by_index(db, robe_idx) if robe_idx else None

        # Détermination du nombre d'épaisseurs à partir de la valeur texte
        nb_epaisseurs = None
        if isinstance(ep_opt, str):
            if ep_opt.startswith("1 épaisseur"):
                nb_epaisseurs = 1
            elif ep_opt.startswith("2 épaisseurs"):
                nb_epaisseurs = 2
            elif ep_opt.startswith("3 épaisseurs"):
                nb_epaisseurs = 3

        # Détermination de est_decollete
        est_decollete = False
        if categorie in ("Décolleté devant", "Décolleté dos") and finition:
            finition_lower = finition.lower()
            # Pour devant : Petit V, Moyen V, Grand V (pas inversé)
            if categorie == "Décolleté devant":
                if "petit v" in finition_lower or "moyen v" in finition_lower or "grand v" in finition_lower:
                    est_decollete = True
            # Pour dos : Forme U, Forme V (pas inversé)
            elif categorie == "Décolleté dos":
                if "forme u" in finition_lower or ("forme v" in finition_lower and "inversé" not in finition_lower):
                    est_decollete = True

        # Détermination de ceinture_possible
        ceinture_possible = False
        if categorie == "Découpe devant" and finition:
            finition_lower = finition.lower()
            # "Cumul de volume en fronce à la taille" = option de ceinture
            if "fronce" in finition_lower and "taille" in finition_lower:
                ceinture_possible = True

        # Détermination de applicable_top_unique
        applicable_top_unique = True  # Par défaut, applicable
        if categorie == "Découpe devant" and finition:
            finition_lower = finition.lower()
            # "Cumul de volume en fronce à la taille" ne doit pas être proposé pour top unique
            if "fronce" in finition_lower and "taille" in finition_lower:
                applicable_top_unique = False

        t = models.TransformationTarif(
            categorie=categorie,
            finition=finition if finition != "/" else None,
            robe_modele_id=robe_modele.id if robe_modele else None,
            epaisseur_ou_option=ep_opt,
            prix=float(prix),
            nb_epaisseurs=nb_epaisseurs,
            est_decollete=est_decollete,
            ceinture_possible=ceinture_possible,
            applicable_top_unique=applicable_top_unique,
        )
        db.add(t)

    db.commit()


def seed_dentelles(db):
    # Supprimer les anciennes dentelles Alpha/Beta/Gamma
    old_dentelles = ["Alpha", "Beta", "Gamma"]
    for old_name in old_dentelles:
        old_d = db.query(models.Dentelle).filter(models.Dentelle.nom == old_name).first()
        if old_d:
            db.delete(old_d)
    
    # Créer les nouvelles dentelles si elles n'existent pas déjà
    print("Création des dentelles...")
    for nom in DENTELLES_DEFAULT:
        existing = db.query(models.Dentelle).filter(models.Dentelle.nom == nom).first()
        if not existing:
            d = models.Dentelle(nom=nom, actif=True)
            db.add(d)
    db.commit()


def seed_tarifs_tissus(db):
    if db.query(models.TissuTarif).count() > 0:
        return
    print("Insertion des tarifs de tissus...")

    data = [
        # Catégorie, RobeIndex (ou None), Détail, Forme, Prix
        ("devant", None, "Dentelle 1 épaisseur", None, 15),
        ("devant", None, "Dentelle et Maille Nude 2 épaisseurs", None, 18),
        ("devant", None, "Crêpe et Doublure 2 épaisseurs", None, 7),
        ("devant", None, "Dentelle, Crêpe et Doublure 3 épaisseurs", None, 22),
        ("devant", None, "Dentelle, Voile et Maille Nude 3 épaisseurs", None, 20),

        ("Dos", None, "Dentelle 1 épaisseur", None, 15),
        ("Dos", None, "Dentelle et Maille Nude 2 épaisseurs", None, 18),
        ("Dos", None, "Crêpe et Doublure 2 épaisseurs", None, 7),
        ("Dos", None, "Dentelle, Crêpe et Doublure 3 épaisseurs", None, 22),
        ("Dos", None, "Dentelle, Voile et Maille Nude 3 épaisseurs", None, 20),

        ("Manches", 1, "Tulipe Dentelle", None, 15),
        ("Manches", 1, "Tulipe crêpe", None, 5),
        ("Manches", 3, "Manchon dentelle", None, 15),
        ("Manches", 3, "Manchon crêpe", None, 5),
        ("Manches", 6, "Manchon dentelle", None, 15),
        ("Manches", 6, "Manchon crêpe", None, 5),
        ("Manches", 2, "Trois quarts dentelle", None, 15),
        ("Manches", 2, "Trois quarts crêpe", None, 5),
        ("Manches", 4, "Trois quarts dentelle", None, 15),
        ("Manches", 4, "Trois quarts crêpe", None, 5),
        ("Manches", 5, "Longue dentelle", None, 30),
        ("Manches", 5, "Longue crêpe", None, 10),

        ("Ceinture", None, "Avec", None, 19),

        ("Bas", 1, "Crêpe et Doublure 2 épaisseurs", "Évasée", 92),
        ("Bas", 3, "Crêpe et Doublure 2 épaisseurs", "Évasée", 92),
        ("Bas", 6, "Crêpe et Doublure 2 épaisseurs", "Évasée", 92),
        ("Bas", 1, "Crêpe Georgette, Doublure interne et Doublure 3 épaisseurs", "Évasée avec fronces", 88),
        ("Bas", 3, "Crêpe Georgette, Doublure interne et Doublure 3 épaisseurs", "Évasée avec fronces", 88),
        ("Bas", 6, "Crêpe Georgette, Doublure interne et Doublure 3 épaisseurs", "Évasée avec fronces", 88),
        ("Bas", 2, "Crêpe et Doublure 2 épaisseurs", "30 degrés", 120),
        ("Bas", 2, "Crêpe Georgette, Doublure interne et Doublure 3 épaisseurs", "30 degrés avec fronces", 112),
        ("Bas", 4, "Crêpe et Doublure 2 épaisseurs", "Fourreau", 92),
        ("Bas", 5, "Crêpe et Doublure 2 épaisseurs", "Droite", 92),
    ]

    for categorie, robe_idx, detail, forme, prix in data:
        robe_modele = get_modele_by_index(db, robe_idx) if robe_idx else None

        detail_lower = detail.lower()

        # nb_epaisseurs
        nb_epaisseurs = None
        if "1 épaisseur" in detail_lower:
            nb_epaisseurs = 1
        elif "2 épaisseurs" in detail_lower:
            nb_epaisseurs = 2
        elif "3 épaisseurs" in detail_lower:
            nb_epaisseurs = 3

        mono_epaisseur = nb_epaisseurs == 1

        # matiere
        matiere = None
        if "crêpe" in detail_lower or "crepe" in detail_lower:
            matiere = "crepe"
        elif "dentelle" in detail_lower:
            matiere = "dentelle"
        elif "maille" in detail_lower:
            matiere = "maille"
        elif "voile" in detail_lower:
            matiere = "voile"

        t = models.TissuTarif(
            categorie=categorie,
            robe_modele_id=robe_modele.id if robe_modele else None,
            detail=detail,
            forme=forme,
            prix=float(prix),
            nb_epaisseurs=nb_epaisseurs,
            mono_epaisseur=mono_epaisseur,
            matiere=matiere,
        )
        db.add(t)

    db.commit()


def seed_finitions_supplementaires(db):
    if db.query(models.FinitionSupplementaire).count() > 0:
        return

    print("Insertion des finitions supplémentaires...")

    data = [
        ("Jupe avec fente milieu devant", 30),
        ("Jupe avec fente au côté gauche au porté", 50),
        ("Quille de dentelle en traîne", 75),
    ]

    for nom, prix in data:
        nom_lower = nom.lower()
        est_fente = (
            "fente" in nom_lower and
            "quille" not in nom_lower
        )
        
        # "Cumul de fronce à la taille" ne doit pas être proposé pour top unique
        # Par défaut, toutes les finitions supplémentaires sont applicables au top unique
        applicable_top_unique = not ("fronce" in nom_lower and "taille" in nom_lower)

        db.add(
            models.FinitionSupplementaire(
                nom=nom,
                prix=float(prix),
                est_fente=est_fente,
                applicable_top_unique=applicable_top_unique,
            )
        )

    db.commit()


def seed_accessoires(db):
    if db.query(models.Accessoire).count() > 0:
        return
    print("Insertion des accessoires...")
    db.add(models.Accessoire(nom="Housse de protection", description=None, prix=0))
    db.commit()


def main():
    print("Création des tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Admins de production
    admins_to_create = [
        {
            "nom": "Constance",
            "email": "cellierconstance@gmail.com",
            "mot_de_passe": "Avmood8691!",
        },
        {
            "nom": "Rémi",
            "email": "rm.vanderperre@gmail.com",
            "mot_de_passe": "Magnusdidnothingwrong123!!?",
        },
    ]
    
    for admin_data in admins_to_create:
        existing = db.query(models.User).filter_by(email=admin_data["email"]).first()
        if not existing:
            print(f"Création de l'admin {admin_data['nom']} ({admin_data['email']})...")
            admin = models.User(
                nom=admin_data["nom"],
                email=admin_data["email"],
                mot_de_passe=get_password_hash(admin_data["mot_de_passe"]),
                type=models.UserType.ADMIN,
            )
            db.add(admin)
        else:
            print(f"Admin {admin_data['nom']} ({admin_data['email']}) existe déjà, mise à jour du mot de passe...")
            existing.mot_de_passe = get_password_hash(admin_data["mot_de_passe"])
    db.commit()

    seed_robe_modeles(db)
    seed_tarifs_transformations(db)
    seed_tarifs_tissus(db)
    seed_finitions_supplementaires(db)
    seed_accessoires(db)
    seed_mesure_types(db)
    seed_dentelles(db)

    db.commit()
    db.close()
    print("Base de données initialisée.")
    print("Admins créés :")
    for admin_data in admins_to_create:
        print(f"  - {admin_data['nom']}: {admin_data['email']} / {admin_data['mot_de_passe']}")


if __name__ == "__main__":
    main()
