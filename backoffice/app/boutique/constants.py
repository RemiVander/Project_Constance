from __future__ import annotations

import os


# Front URL used in password reset flows.
FRONT_BASE_URL: str = os.getenv("FRONT_BASE_URL", "http://localhost:3000")


# IMPORTANT: override in production using an env var.
# Kept backwards-compatible with previous behaviour (same default string).
SECRET_KEY: str = os.getenv("BOUTIQUE_SECRET_KEY", "CHANGE_ME_SECRET_KEY")


# Token TTL (7 days).
TOKEN_MAX_AGE_SECONDS: int = int(os.getenv("BOUTIQUE_TOKEN_MAX_AGE_SECONDS", str(60 * 60 * 24 * 7)))


# Pricing constants.
TVA_RATE: float = float(os.getenv("TVA_RATE", "0.20"))

# Margins:
# - boutique margin on creator price
# - creator margin on internal cost (prix_total)
MARGE_BOUTIQUE: float = float(os.getenv("MARGE_BOUTIQUE", "2.5"))
MARGE_CREATRICE: float = float(os.getenv("MARGE_CREATRICE", "2"))
