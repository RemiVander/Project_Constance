from sqlmodel import SQLModel, Field
from typing import Optional

class Transformations(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    colonne1: str = Field(max_length=100)  # "transformation"
    categories: str = Field(max_length=100)  # "Decolleté devant"
    finitions: str = Field(max_length=100)  # "Rond"
    robes: str = Field(max_length=50)  # "Robe 1", "Robe 5"
    epaisseurs: str = Field(max_length=50)  # "2 épaisseurs"
    prix: float  # 30