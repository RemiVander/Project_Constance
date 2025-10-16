from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.database import Base
import datetime

class BonDeCommande(Base):
    __tablename__ = "bons_de_commande"
    id = Column(Integer, primary_key=True, index=True)
    devis_id = Column(Integer, ForeignKey("devis.id"))
    etat = Column(String)
    date_creation = Column(DateTime, default=datetime.datetime.utcnow)