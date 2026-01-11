from __future__ import annotations

import os
from ..config import BOUTIQUE_SECRET_KEY, FRONT_BASE_URL

# Front URL used in password reset flows.
# Utilise la configuration centralisée
# FRONT_BASE_URL est importé depuis config

# Clé secrète pour les tokens boutique (utilise la configuration centralisée)
SECRET_KEY: str = BOUTIQUE_SECRET_KEY


# Token TTL (7 days).
TOKEN_MAX_AGE_SECONDS: int = int(os.getenv("BOUTIQUE_TOKEN_MAX_AGE_SECONDS", str(60 * 60 * 24 * 7)))


# Pricing constants.
TVA_RATE: float = float(os.getenv("TVA_RATE", "0.20"))

# Margins:
# - boutique margin on creator price
# - creator margin on internal cost (prix_total)
MARGE_BOUTIQUE: float = float(os.getenv("MARGE_BOUTIQUE", "2.5"))
MARGE_CREATRICE: float = float(os.getenv("MARGE_CREATRICE", "2"))
