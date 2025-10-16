from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.db.database import Base

class FinitionSupplementaire(Base):
    __tablename__ = "finitions_supplementaires"
    id = Column(Integer, primary_key=True, index=True)
    transformation_id = Column(Integer, ForeignKey("transformations.id"))
    description = Column(String)
    prix = Column(Float)