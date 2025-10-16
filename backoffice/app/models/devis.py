from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base
import datetime

class Devis(Base):
    __tablename__ = "devis"
    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    status = Column(String)
    date_creation = Column(DateTime, default=datetime.datetime.utcnow)
    prix_total = Column(Float)
    robes = relationship("Robe", back_populates="devis")