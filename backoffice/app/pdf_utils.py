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
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "SARL Cellier Constance")
    y -= 14
    c.setFont("Helvetica", 10)
    c.drawString(50, y, "Siren : 992 306 373")
    y -= 14
    c.drawString(50, y, "3, rue Maryse Bastié – 59840 Pérenchies")
    y -= 24

    # TITRE
    c.setFont("Helvetica-Bold", 16)
    c.drawString(
        50,
        y,
        "Devis création robe de mariée" if type == "devis" else "Bon de commande",
    )
    y -= 26

    # Référence
    ref = f"{boutique.nom}-{devis.numero_boutique}"
    if devis.date_creation:
        c.setFont("Helvetica", 10)
        c.drawString(50, y, f"Date : {devis.date_creation.strftime('%d/%m/%Y')}")
        y -= 14

    c.drawString(50, y, f"Référence : {ref}")
    y -= 24

    # Boutique
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Boutique partenaire :")
    y -= 14

    c.setFont("Helvetica", 10)
    c.drawString(60, y, boutique.nom)
    y -= 14

    if boutique.numero_tva:
        c.drawString(60, y, f"N° TVA : {boutique.numero_tva}")
        y -= 14

    if boutique.adresse:
        c.drawString(60, y, boutique.adresse)
        y -= 14


    # ======================
    # TABLEAU DES LIGNES
    # ======================
    y -= 16
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Détail de la création")
    y -= 18

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, y, "Description")
    c.drawRightString(540, y, "Qté")
    y -= 12
    c.line(50, y, width - 50, y)
    y -= 14

    c.setFont("Helvetica", 10)
    for ligne in lignes:
        desc = "Robe de mariée demi-mesure"
        quantite = ligne.quantite or 1

        for i, line in enumerate(textwrap.wrap(desc, width=95)):
            if y < 80:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 50

            c.drawString(50, y, line)
            if i == 0:
                c.drawRightString(540, y, str(quantite))
            y -= 16

    # ======================
    # DESCRIPTION DÉTAILLÉE
    # (juste après le tableau)
    # ======================
    y -= 16
    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Description de la création")
    y -= 18

    c.setFont("Helvetica", 10)
    description = (
        devis.lignes[0].description
        if getattr(devis, "lignes", None)
        else devis.description
    ) or "Robe de mariée sur-mesure"

    for line in textwrap.wrap(description, width=95):
        if y < 80:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = height - 50
        c.drawString(60, y, line)
        y -= 14

    # Commentaire boutique (bon uniquement)
    if type == "bon" and getattr(devis, "commentaire_boutique", None):
        y -= 10
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "Commentaire de la boutique")
        y -= 18

        c.setFont("Helvetica", 10)
        for line in textwrap.wrap(devis.commentaire_boutique.replace("\n", " "), 100):
            if y < 80:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 50
            c.drawString(60, y, line)
            y -= 14

    # Mesures (bon uniquement)
    if type == "bon" and mesures:
        y -= 10
        c.setFont("Helvetica-Bold", 11)
        c.drawString(50, y, "Mesures fournies")
        y -= 18

        c.setFont("Helvetica", 10)
        for m in mesures:
            if y < 80:
                c.showPage()
                c.setFont("Helvetica", 10)
                y = height - 50
            label = (
                m.type.label
                if getattr(m, "type", None)
                else f"Mesure {m.mesure_type_id}"
            )
            c.drawString(60, y, f"{label} : {m.valeur}")
            y -= 14

    # ======================
    # MONTANTS
    # ======================
    y -= 10
    c.line(50, y, width - 50, y)
    y -= 24

    c.setFont("Helvetica-Bold", 11)
    c.drawString(50, y, "Récapitulatif des montants")
    y -= 18

    p_ht, p_tva, p_ttc = (
        prix["partenaire_ht"],
        prix["partenaire_tva"],
        prix["partenaire_ttc"],
    )
    c_ht, c_tva, c_ttc = prix["client_ht"], prix["client_tva"], prix["client_ttc"]

    c.setFont("Helvetica", 10)
    c.drawString(60, y, "Montant HT :")
    c.drawRightString(540, y, f"{p_ht:.2f} €")
    y -= 14

    c.drawString(60, y, "TVA (20 %) :")
    c.drawRightString(540, y, f"{p_tva:.2f} €")
    y -= 14

    c.drawString(60, y, "Montant TTC :")
    c.drawRightString(540, y, f"{p_ttc:.2f} €")
    y -= 20

    # Mention finale
    c.setFont("Helvetica", 9)
    if type == "devis":
        c.drawString(
            50, y, "Devis valable 20 jours à compter de sa date d'émission."
        )
    else:
        c.drawString(
            50, y, "Bon de commande basé sur le devis précédemment validé."
        )
    y -= 12

    c.drawString(
        50, y, "Conditions générales de vente : www.constancecellier.fr/cgv"
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
