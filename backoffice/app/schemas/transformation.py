from pydantic import BaseModel

class TransformationBase(BaseModel):
    robe_id: int
    categorie: str
    finition: str
    epaisseurs: int
    prix: float

class TransformationCreate(TransformationBase):
    pass

class Transformation(TransformationBase):
    id: int
    class Config:
        from_attributes = True