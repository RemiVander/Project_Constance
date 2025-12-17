from fastapi import APIRouter

from .dashboard import router as dashboard_router
from .boutiques import router as boutiques_router
from .produits import router as produits_router
from .bons_commande import router as bons_commande_router

# Single router exported for inclusion in the FastAPI app.
# All subrouters keep their original absolute paths.
router = APIRouter()

router.include_router(dashboard_router)
router.include_router(boutiques_router)
router.include_router(produits_router)
router.include_router(bons_commande_router)
