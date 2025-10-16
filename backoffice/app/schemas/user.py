from pydantic import BaseModel

class UserBase(BaseModel):
    nom: str
    email: str
    mot_de_passe: str
    role: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    class Config:
        orm_mode = True