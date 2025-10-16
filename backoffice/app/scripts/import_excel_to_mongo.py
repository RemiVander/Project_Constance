import pandas as pd
from pymongo import MongoClient

EXCEL_PATH = "Book 2(1).xlsx"
MONGO_URI = "mongodb://localhost:27017"

client = MongoClient(MONGO_URI)

def insert_data(db_name, df):
    db = client[db_name]
    categories_col = db["categories"]
    items_col = db["items"]

    df = df.dropna(how="all")
    df.columns = [str(c).strip() for c in df.columns]

    category_col = None
    for c in df.columns:
        if "cat" in c.lower():
            category_col = c
            break

    for _, row in df.iterrows():
        category_name = row[category_col] if category_col and pd.notna(row[category_col]) else "Autre"
        category_doc = categories_col.find_one({"name": category_name})
        if not category_doc:
            cat_id = categories_col.insert_one({"name": category_name}).inserted_id
        else:
            cat_id = category_doc["_id"]

        item_doc = row.to_dict()
        item_doc["category_id"] = cat_id
        items_col.insert_one(item_doc)

    print(f"✅ {len(df)} lignes insérées dans la base '{db_name}'")


def main():
    xls = pd.ExcelFile(EXCEL_PATH)
    sheet_names = xls.sheet_names
    print("Onglets trouvés :", sheet_names)

    # === TRANSFORMATION ===
    df_transformation = pd.read_excel(xls, sheet_name=sheet_names[0])
    insert_data("transformation", df_transformation)

    # === FINITIONS / SUPPLÉMENTS ===
    df_finitions = pd.read_excel(xls, sheet_name=sheet_names[1], header=None)
    df_finitions = df_finitions.dropna(how="all")

    # Trouve les lignes complètement vides pour séparer les tableaux
    split_index = df_finitions[df_finitions.isnull().all(axis=1)].index
    print(f"Lignes vides détectées (séparateurs potentiels) : {list(split_index)}")

    # Définition des tranches
    if len(split_index) > 0:
        sep = split_index[0]
        df_fin = df_finitions.iloc[:sep].dropna(how="all")
        df_sup = df_finitions.iloc[sep+1:].dropna(how="all")
    else:
        df_fin = df_finitions
        df_sup = pd.DataFrame()

    # Vérification avant traitement
    if not df_fin.empty:
        df_fin.columns = df_fin.iloc[0]
        df_fin = df_fin[1:]
        insert_data("finitions", df_fin)
    else:
        print("⚠️ Aucun tableau 'finitions' détecté.")

    if not df_sup.empty:
        df_sup.columns = df_sup.iloc[0]
        df_sup = df_sup[1:]
        insert_data("suppléments", df_sup)
    else:
        print("⚠️ Aucun tableau 'suppléments' détecté.")

    print("\n✅ Import terminé avec succès !")

if __name__ == "__main__":
    main()
