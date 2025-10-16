from sqlalchemy import Column, Integer, String, Float
from app.db.database import Base

class Tissu(Base):
    __tablename__ = "tissus"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String)
    prix = Column(Float)
    forme = Column(String)
    stock = Column(Integer)