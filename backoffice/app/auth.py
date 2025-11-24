
from fastapi import APIRouter, Depends, Form, Request, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from .database import SessionLocal
from . import models

router = APIRouter()

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


@router.post("/admin/login")
def admin_login(
    request: Request,
    email: str = Form(...),
    mot_de_passe: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter_by(email=email, type=models.UserType.ADMIN).first()
    if not user or not verify_password(mot_de_passe, user.mot_de_passe):
        raise HTTPException(status_code=400, detail="Identifiants invalides")

    request.session["admin_id"] = user.id
    return RedirectResponse(url="/admin/dashboard", status_code=302)


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> models.User:
    admin_id = request.session.get("admin_id")
    if not admin_id:
        raise HTTPException(status_code=401, detail="Non authentifié")
    admin = db.query(models.User).filter_by(id=admin_id, type=models.UserType.ADMIN).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Non authentifié")
    return admin
