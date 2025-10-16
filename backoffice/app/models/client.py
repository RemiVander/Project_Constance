from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Client(Base):
    __tablename__ = "clients"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    historique_devis = relationship("Devis", back_populates="client")