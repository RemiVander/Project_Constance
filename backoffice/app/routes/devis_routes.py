from fastapi import APIRouter
from app.schemas.devis import Devis, DevisCreate

router = APIRouter(prefix="/devis", tags=["devis"])

@router.post("/", response_model=Devis)
def create_devis(devis: DevisCreate):
    return devis