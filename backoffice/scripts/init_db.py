
from app.database import Base, engine

def init_db():
    print("Création des tables dans la base...")
    Base.metadata.create_all(bind=engine)
    print("Terminé.")

if __name__ == "__main__":
    init_db()
