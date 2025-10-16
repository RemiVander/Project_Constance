from sqlalchemy import Column, Integer, ForeignKey
from app.db.database import Base

class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, ForeignKey("users.id"), primary_key=True)