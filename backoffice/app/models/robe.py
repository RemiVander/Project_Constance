from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Robe(Base):
    __tablename__ = "robes"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String)
    devis_id = Column(Integer, ForeignKey("devis.id"))
    transformations = relationship("Transformation", back_populates="robe")
    devis = relationship("Devis", back_populates="robes")