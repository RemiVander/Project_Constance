from __future__ import annotations

from typing import Dict

from .. import models
from .constants import MARGE_BOUTIQUE, MARGE_CREATRICE, TVA_RATE


def compute_prix_boutique_et_client(devis: models.Devis) -> Dict[str, float]:
    """Compute displayed prices from devis.prix_total (internal cost).

    Returns:
        partenaire_ht / partenaire_tva / partenaire_ttc
        client_ht / client_tva / client_ttc
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
