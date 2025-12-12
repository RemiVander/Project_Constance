import os
import smtplib
from email.message import EmailMessage
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "no-reply@example.com")

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")


MAIL_DEBUG_TO = os.getenv("MAIL_DEBUG_TO", "")

def _send(to_email: str, subject: str, text: str, html: Optional[str] = None) -> None:
    if not SMTP_HOST:
        print(f"[WARNING] SMTP non configuré, email non envoyé pour: {to_email}")
        return

    final_to = MAIL_DEBUG_TO or to_email

    msg = EmailMessage()
    msg["From"] = SMTP_FROM
    msg["To"] = final_to
    msg["Subject"] = subject
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.ehlo()

            try:
                if server.has_extn("STARTTLS"):
                    server.starttls()
                    server.ehlo()
            except Exception as e:
                print("[MAIL] STARTTLS failed:", e)

            # Login uniquement si on a un user
            if SMTP_USER:
                server.login(SMTP_USER, SMTP_PASSWORD)

            server.send_message(msg)

        print(f"[MAIL] Sent to={final_to} subject={subject}")

    except Exception as e:
        print(f"[MAIL ERROR] to={final_to} subject={subject} err={repr(e)}")


def wrap_email(title: str, content_html: str) -> str:
    return f"""\
<!doctype html>
<html lang="fr">
  <body style="font-family:Arial,sans-serif;background:#f6f6f6;padding:24px;">
    <div style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;padding:20px;border:1px solid #eee;">
      <h2 style="margin:0 0 12px 0;">{title}</h2>
      <div style="font-size:14px;line-height:1.6;color:#222;">{content_html}</div>
      <hr style="margin:18px 0;border:none;border-top:1px solid #eee;" />
      <div style="font-size:12px;color:#666;">Constance Cellier — Espace partenaires</div>
    </div>
  </body>
</html>
"""

# --- 1) Déjà existant : création boutique / mdp temporaire
def send_boutique_password_email(to_email: str, boutique_name: str, password: str):
    subject = "Vos accès à l’espace partenaires Constance Cellier"
    text = f"""Bonjour,

Votre boutique "{boutique_name}" a été créée.

Identifiants :
- Email : {to_email}
- Mot de passe temporaire : {password}

Vous devrez changer ce mot de passe lors de votre première connexion.

Cordialement,
Constance Cellier
"""
    html = wrap_email(
        "Bienvenue 👋",
        f"""
        <p>Votre boutique <b>{boutique_name}</b> a été créée.</p>
        <p><b>Email :</b> {to_email}<br/>
           <b>Mot de passe temporaire :</b> {password}</p>
        <p>Vous devrez changer ce mot de passe lors de votre première connexion.</p>
        """
    )
    _send(to_email, subject, text, html)

# --- 2) Boutique -> admin : BC soumis / revalidé
def send_admin_bc_notification(subject: str, html_block: str, text: str):
    if not ADMIN_EMAIL:
        return
    _send(ADMIN_EMAIL, subject, text, wrap_email("Notification bon de commande", html_block))

# --- 3) Admin -> boutique : BC renvoyé / accepté / refusé
def send_boutique_bc_notification(to_email: str, subject: str, html_block: str, text: str):
    _send(to_email, subject, text, wrap_email("Bon de commande", html_block))

# --- 4) Mot de passe oublié
def send_password_reset_email(to_email: str, reset_link: str):
    subject = "Réinitialisation de votre mot de passe"
    text = f"""Bonjour,

Vous avez demandé une réinitialisation de mot de passe.
Lien (valable 2h) : {reset_link}

Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.
"""
    html = wrap_email(
        "Mot de passe oublié",
        f"""
        <p>Vous avez demandé une réinitialisation de mot de passe (valable 2h).</p>
        <p><a href="{reset_link}">{reset_link}</a></p>
        <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
        """
    )
    _send(to_email, subject, text, html)
