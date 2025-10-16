from sqlalchemy import Column, Integer, ForeignKey
from app.db.database import Base

class ChoixTissu(Base):
    __tablename__ = "choix_tissus"
    id = Column(Integer, primary_key=True, index=True)
    transformation_id = Column(Integer, ForeignKey("transformations.id"))
    tissu_id = Column(Integer, ForeignKey("tissus.id"))
    quantite = Column(Integer)