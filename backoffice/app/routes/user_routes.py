from fastapi import APIRouter
from app.schemas.user import User, UserCreate

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/", response_model=User)
def create_user(user: UserCreate):
    return user