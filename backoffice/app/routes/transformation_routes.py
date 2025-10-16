from fastapi import APIRouter
from app.schemas.transformation import Transformation, TransformationCreate

router = APIRouter(prefix="/transformations", tags=["transformations"])

@router.post("/", response_model=Transformation)
def create_transformation(transformation: TransformationCreate):
    return transformation