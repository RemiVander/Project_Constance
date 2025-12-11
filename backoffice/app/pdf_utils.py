import os
import textwrap
from io import BytesIO
from fastapi.responses import StreamingResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4


def generate_pdf_devis_bon(
    devis,
    boutique,
    prix,
    lignes,
    *,
    type="devis",
    mesures=None,
):
    """
    Génère un PDF pour :
    - type="devis"
    - type="bon"

    Sections communes :
    - entête
    - logo
    - tableau des lignes
    - description détaillée
    - montants

    Sections spécifiques :
    - commentaire_boutique (bon)
    - mesures (bon)
    - mentions devis / bon
    """

    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 50

    # ===== helper pour gérer proprement la fin de page =====
    def safe_draw(
        text: str,
        x: float,
        y_pos: float,
        *,
        font_name: str = "Helvetica",
        font_size: int = 10,
        line_height: float = 14,
        right: bool = False,
    ) -> float:
        nonlocal c, width, height
        if y_pos < 60:
            c.showPage()
            y_pos = height - 60
        c.setFont(font_name, font_size)
        if right:
            c.drawRightString(x, y_pos, text)
        else:
            c.drawString(x, y_pos, text)
        return y_pos - line_height

    def safe_line(y_pos: float) -> float:
        nonlocal c, width, height
        if y_pos < 60:
            c.showPage()
            y_pos = height - 60
        c.line(50, y_pos, width - 50, y_pos)
        return y_pos - 2

    # LOGO
    logo_path = os.path.join("app", "static", "logo_bande.png")
    if os.path.exists(logo_path):
        c.drawImage(
            logo_path,
            50,
            height - 120,
            width=350,
            height=70,
            preserveAspectRatio=True,
            mask="auto",
        )
        y = height - 150

    # ENTÊTE
    y = safe_draw("SARL Cellier Constance", 50, y, font_name="Helvetica-Bold", font_size=11)
    y = safe_draw("Siren : 992 306 373", 50, y)
    y = safe_draw("3, rue Maryse Bastié – 59840 Pérenchies", 50, y)
    y -= 10

    # TITRE
    titre = "Devis création robe de mariée" if type == "devis" else "Bon de commande"
    y = safe_draw(titre, 50, y, font_name="Helvetica-Bold", font_size=16, line_height=26)

    # Référence & date
    ref = f"{boutique.nom}-{devis.numero_boutique}"
    if devis.date_creation:
        y = safe_draw(
            f"Date : {devis.date_creation.strftime('%d/%m/%Y')}",
            50,
            y,
        )
    y = safe_draw(f"Référence : {ref}", 50, y)
    y -= 10

    # Boutique
    y = safe_draw("Boutique partenaire :", 50, y, font_name="Helvetica-Bold", font_size=11)
    y = safe_draw(boutique.nom, 60, y)

    if boutique.numero_tva:
        y = safe_draw(f"N° TVA : {boutique.numero_tva}", 60, y)

    if boutique.adresse:
        y = safe_draw(boutique.adresse, 60, y)

    # ======================
    # TABLEAU DES LIGNES
    # ======================
    y -= 16
    y = safe_draw("Détail de la création", 50, y, font_name="Helvetica-Bold", font_size=11, line_height=18)

    y = safe_draw("Description", 50, y, font_name="Helvetica-Bold", font_size=10, line_height=12)
    y = safe_draw("Qté", 540, y, font_name="Helvetica-Bold", font_size=10, line_height=12, right=True)
    y = safe_line(y)
    y -= 12

    if not lignes:
        # fallback si pas de lignes : au moins une ligne générique
        desc = "Robe de mariée demi-mesure"
        y = safe_draw(desc, 50, y)
        y = safe_draw("1", 540, y, right=True)
    else:
        for ligne in lignes:
            desc = "Robe de mariée demi-mesure"
            quantite = ligne.quantite or 1
            wrapped = textwrap.wrap(desc, width=95)
            for i, line in enumerate(wrapped):
                y = safe_draw(line, 50, y)
                if i == 0:
                    y = safe_draw(str(quantite), 540, y + 14, right=True) 
  

    # ======================
    # DESCRIPTION DÉTAILLÉE
    # ======================
    y -= 16
    y = safe_draw(
        "Description de la création",
        50,
        y,
        font_name="Helvetica-Bold",
        font_size=11,
        line_height=18,
    )

    description = (
        devis.lignes[0].description
        if getattr(devis, "lignes", None)
        else devis.description
    ) or "Robe de mariée sur-mesure"

    for line in textwrap.wrap(description, width=95):
        y = safe_draw(line, 60, y)

    # Commentaire boutique (bon uniquement)
    if type == "bon" and getattr(devis, "commentaire_boutique", None):
        y -= 10
        y = safe_draw(
            "Commentaire de la boutique",
            50,
            y,
            font_name="Helvetica-Bold",
            font_size=11,
            line_height=18,
        )
        for line in textwrap.wrap(devis.commentaire_boutique.replace("\n", " "), 100):
            y = safe_draw(line, 60, y)

    # Mesures (bon uniquement)
    if type == "bon" and mesures:
        y -= 10
        y = safe_draw(
            "Mesures fournies",
            50,
            y,
            font_name="Helvetica-Bold",
            font_size=11,
            line_height=18,
        )

        for m in mesures:
            label = (
                m.type.label
                if getattr(m, "type", None)
                else f"Mesure {m.mesure_type_id}"
            )
            y = safe_draw(f"{label} : {m.valeur}", 60, y)

    # ======================
    # MONTANTS
    # ======================
    y -= 10
    y = safe_line(y)
    y -= 10

    y = safe_draw(
        "Récapitulatif des montants",
        50,
        y,
        font_name="Helvetica-Bold",
        font_size=11,
        line_height=18,
    )

    p_ht, p_tva, p_ttc = (
        prix["partenaire_ht"],
        prix["partenaire_tva"],
        prix["partenaire_ttc"],
    )
    c_ht, c_tva, c_ttc = prix["client_ht"], prix["client_tva"], prix["client_ttc"]

    y = safe_draw("Montant HT :", 60, y)
    y = safe_draw(f"{p_ht:.2f} €", 540, y + 14, right=True)

    y = safe_draw("TVA (20 %) :", 60, y)
    y = safe_draw(f"{p_tva:.2f} €", 540, y + 14, right=True)

    y = safe_draw("Montant TTC :", 60, y)
    y = safe_draw(f"{p_ttc:.2f} €", 540, y + 14, right=True)

    # ======================
    # MENTIONS FINALES
    # ======================
    y -= 10
    if type == "devis":
        y = safe_draw(
            "Devis valable 20 jours à compter de sa date d'émission.",
            50,
            y,
            font_name="Helvetica",
            font_size=9,
            line_height=12,
        )
    else:
        y = safe_draw(
            "Bon de commande basé sur le devis précédemment validé.",
            50,
            y,
            font_name="Helvetica",
            font_size=9,
            line_height=12,
        )

    y = safe_draw(
        "Conditions générales de vente : www.constancecellier.fr/cgv",
        50,
        y,
        font_name="Helvetica",
        font_size=9,
        line_height=12,
    )

    # Finalisation
    c.showPage()
    c.save()
    buffer.seek(0)

    filename = f"{type}_{ref}.pdf".replace(" ", "_")

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
