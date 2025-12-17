"""Compatibility module.

Historically all admin endpoints lived in this file (god-module).
They have been split into smaller routers under `app.admin.*`.

Keeping this module allows existing imports (`from app import admin_routes`)
to keep working without changing the app wiring.
"""

from .admin.router import router  # noqa: F401

# Re-export a few public schemas that were previously defined here.
from .admin.boutiques import BoutiqueCreateRequest  # noqa: F401
from .admin.bons_commande import DecisionBCPayload  # noqa: F401
