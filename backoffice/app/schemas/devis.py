from pydantic import BaseModel
from datetime import datetime

class DevisBase(BaseModel):
    client_id: int
    status: str
    prix_total: float

class DevisCreate(DevisBase):
    pass

class Devis(DevisBase):
    id: int
    date_creation: datetime
    class Config:
        orm_mode = True