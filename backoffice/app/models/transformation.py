from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Transformation(Base):
    __tablename__ = "transformations"
    id = Column(Integer, primary_key=True, index=True)
    robe_id = Column(Integer, ForeignKey("robes.id"))
    categorie = Column(String)
    finition = Column(String)
    epaisseurs = Column(Integer)
    prix = Column(Float)
    robe = relationship("Robe", back_populates="transformations")