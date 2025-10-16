from fastapi import APIRouter
from app.schemas.robe import Robe, RobeCreate

router = APIRouter(prefix="/robes", tags=["robes"])

@router.post("/", response_model=Robe)
def create_robe(robe: RobeCreate):
    return robe