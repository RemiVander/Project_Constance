
import os
import smtplib
from email.message import EmailMessage


SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@example.com")


def send_boutique_password_email(to_email: str, boutique_name: str, password: str):
    """Envoie un email avec le mot de passe initial de la boutique.

    Nécessite que les variables d'environnement SMTP_* soient configurées.
    """
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print("[WARNING] SMTP non configuré, email non envoyé pour:", to_email)
        return

    msg = EmailMessage()
    msg["Subject"] = "Vos accès à la plateforme B2B"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email

    body = f"""Bonjour {boutique_name},

Un compte a été créé pour votre boutique sur la plateforme B2B.

Identifiants de connexion (pour le futur front boutique) :
    Email : {to_email}
    Mot de passe initial : {password}

Pour des raisons de sécurité, vous devrez changer ce mot de passe lors de votre première connexion.

Cordialement,
L'équipe B2B Robes
"""

    msg.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
