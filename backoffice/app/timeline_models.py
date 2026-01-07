from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class BonCommandeEvent(Base):
    __tablename__ = "bon_commande_events"

    id = Column(Integer, primary_key=True, index=True)
    bon_commande_id = Column(Integer, ForeignKey("bons_commandes.id"), index=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    actor_type = Column(String(20), nullable=False)
    actor_id = Column(Integer, nullable=True)
    event_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=True)

    bon_commande = relationship("BonCommande", backref="events")
