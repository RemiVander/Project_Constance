from pydantic import BaseModel

class RobeBase(BaseModel):
    nom: str
    devis_id: int

class RobeCreate(RobeBase):
    pass

class Robe(RobeBase):
    id: int
    class Config:
        from_attributes = True