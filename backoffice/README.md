
# Back-office B2B Robes (v4.1)

Back-office admin uniquement, avec :

- gestion des boutiques partenaires (création, suivi, stats)
- gestion des modèles de robes (Alizé, Bora, Eurus, Ghibli, Mistral, Zephyr)
- base tarifaire complète pour :
  - transformations (décolletés, découpes, manches, bas, ceinture, etc.)
  - tissus / matières par zone (devant, dos, manches, ceinture, bas)
  - finitions supplémentaires
  - accessoires
- numérotation des devis propre à chaque boutique (ex: Paris-#1)
- dashboards (Chart.js)
- envoi d'email de mot de passe initial via SMTP (pour les boutiques, futur front)

## Spécificités v4.1

Règles métier sur les booléens de `tarifs_transformations` :

- `est_decollete` :
  - ne s'applique qu'aux catégories **"Décolleté devant"** et **"Décolleté dos"**
  - pour toutes les autres catégories, il est automatiquement forcé à `False`
- `ceinture_possible` :
  - ne s'applique qu'à **"Découpe devant"**
  - pour toutes les autres catégories, il est automatiquement forcé à `True`

Côté interface admin :

- dans la liste des tarifs de transformations :
  - la case **"Décolleté ?"** n'est affichée que si `categorie` ∈ {"Décolleté devant", "Décolleté dos"}
  - la case **"Ceinture ok ?"** n'est affichée que si `categorie` == "Découpe devant"
- dans le formulaire d'ajout, un petit rappel texte indique ces règles.

## Installation

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

## Base de données

Par défaut, SQLite (`b2b_robe.db`).

Pour créer les tables :

```bash
python init_db.py
```

Pour créer un admin par défaut + les modèles de robes + la grille tarifaire :

```bash
python create_admin_and_sample.py
```

Admin par défaut :
- email : `admin@example.com`
- mot de passe : `admin123`

## Structure métier

### Modèles de robes

Table `robe_modeles` :

- Alizé (robe 1)
- Bora (robe 2)
- Eurus (robe 3)
- Ghibli (robe 4)
- Mistral (robe 5)
- Zephyr (robe 6)

### Tarifs de transformations

Table `tarifs_transformations` :

- `categorie` (ex: "Décolleté devant", "Décolleté dos", "Découpe devant", "Découpe dos", "Manches", "Bas", "Ceinture", "Découpe taille devant et dos")
- `finition` (Rond, Petit V, Effet Bustier, etc.)
- `robe_modele_id` (Alizé, Bora, etc. selon ton tableau)
- `epaisseur_ou_option` (ex: "2 épaisseurs", "3 épaisseurs", "Boléro", "Robe 3 et 6", etc.)
- `prix`
- `est_decollete` (bool) :
  - significatif uniquement pour décolleté devant/dos
- `ceinture_possible` (bool) :
  - significatif uniquement pour découpe devant

### Tarifs de tissus

Table `tarifs_tissus` :

- `categorie` : devant, Dos, Manches, Ceinture, Bas
- `robe_modele_id` : parfois lié à un modèle (manches, bas), parfois global (devant, dos, ceinture)
- `detail` : description de la composition (Dentelle 1 épaisseur, Crêpe et Doublure 2 épaisseurs, etc.)
- `forme` : évasée, 30 degrés, Fourreau, etc. (pour les bas)
- `prix`

### Finitions supplémentaires

Table `finitions_supplementaires` :

- Jupe avec fente milieu devant – 30 €
- Jupe avec fente au côté gauche au porté – 50 €
- Quille de dentelle en traîne – 75 €

### Accessoires

Table `accessoires` :

- Housse de protection – 10 €

## Interfaces admin

Menu **Produits** :

- **Modèles de robes** : gestion des noms (ajout/suppression/modification).
- **Tarifs transformations** : CRUD sur toutes les lignes de ton premier tableau (catégorie, finition, robe, épaisseur/option, prix, est_decollete, ceinture_possible).
- **Tarifs tissus** : CRUD sur toutes les lignes du second tableau (catégorie, robe, détail, forme, prix).
- **Finitions supplémentaires** : CRUD sur les finitions additionnelles.
- **Accessoires** : CRUD sur les accessoires (pré-rempli avec "Housse de protection").

## SMTP (envoi de mot de passe aux boutiques)

Variables d'environnement :

- `SMTP_HOST`
- `SMTP_PORT` (ex: 587)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM` (optionnel, sinon = SMTP_USER)

Si non configuré, l'app affiche un warning en console et n'envoie pas d'emails.

## Lancer le serveur

```bash
uvicorn app.main:app --reload
```

Interface admin :
- `http://127.0.0.1:8000/` -> `/admin/login`
