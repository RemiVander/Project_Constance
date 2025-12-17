from __future__ import annotations

import json
from typing import List, Optional

from .. import models
from .pricing import compute_prix_boutique_et_client
from .schemas import DevisPublic, LigneDevisPublic, MesureValeurPublic


def build_devis_public(
    devis: models.Devis,
    boutique: models.Boutique,
    include_lignes: bool = True,
) -> DevisPublic:
    """Map ORM Devis -> API DevisPublic.

    Keeps behaviour identical to previous implementation (same price logic,
    same JSON parsing, same optional nested data).
    """

    prix = compute_prix_boutique_et_client(devis)
    has_tva = bool(boutique.numero_tva)

    prix_boutique_affiche = prix["partenaire_ht"] if has_tva else prix["partenaire_ttc"]

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
            MesureValeurPublic(mesure_type_id=m.mesure_type_id, valeur=m.valeur)
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
