from app.utils.mailer import send_email, wrap_email, ADMIN_EMAIL
from app.utils.security import reset_link

def mail_boutique_welcome(email: str, nom_boutique: str, temp_password: str) -> None:
    subject = "Vos accès à l’espace partenaires Constance Cellier"
    html = wrap_email(
        "Bienvenue 👋",
        f"""
        <p>Votre boutique <b>{nom_boutique}</b> a été créée.</p>
        <p>Voici vos identifiants :</p>
        <ul>
          <li><b>Email :</b> {email}</li>
          <li><b>Mot de passe temporaire :</b> {temp_password}</li>
        </ul>
        <p>À la première connexion, vous devrez modifier votre mot de passe.</p>
        """
    )
    send_email(email, subject, html)

def mail_admin_bc_created(ref: str, boutique_nom: str) -> None:
    if not ADMIN_EMAIL:
        return
    subject = f"Nouveau bon de commande à valider — {ref}"
    html = wrap_email(
        "Nouveau bon de commande",
        f"<p>La boutique <b>{boutique_nom}</b> a créé / soumis le bon de commande <b>{ref}</b>.</p>"
    )
    send_email(ADMIN_EMAIL, subject, html)

def mail_boutique_bc_returned(email: str, ref: str, commentaire_admin: str) -> None:
    subject = f"Bon de commande à corriger — {ref}"
    html = wrap_email(
        "Correction demandée",
        f"""
        <p>Votre bon de commande <b>{ref}</b> nécessite une correction.</p>
        <p><b>Commentaire de l’admin :</b></p>
        <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;background:#fafafa;">
          {commentaire_admin or "—"}
        </div>
        """
    )
    send_email(email, subject, html)

def mail_admin_bc_resubmitted(ref: str, boutique_nom: str, commentaire_boutique: str) -> None:
    if not ADMIN_EMAIL:
        return
    subject = f"Bon de commande revalidé par la boutique — {ref}"
    html = wrap_email(
        "Bon de commande revalidé",
        f"""
        <p>La boutique <b>{boutique_nom}</b> a revalidé le bon de commande <b>{ref}</b>.</p>
        <p><b>Commentaire boutique :</b></p>
        <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;background:#fafafa;">
          {commentaire_boutique or "—"}
        </div>
        """
    )
    send_email(ADMIN_EMAIL, subject, html)

def mail_boutique_bc_final(email: str, ref: str, decision: str, commentaire_admin: str | None = None) -> None:
    # decision = "accepté" / "refusé"
    subject = f"Bon de commande {decision} — {ref}"
    extra = ""
    if commentaire_admin:
        extra = f"""
        <p><b>Commentaire admin :</b></p>
        <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;background:#fafafa;">
          {commentaire_admin}
        </div>
        """
    html = wrap_email(
        f"Bon de commande {decision}",
        f"<p>Votre bon de commande <b>{ref}</b> a été <b>{decision}</b>.</p>{extra}"
    )
    send_email(email, subject, html)

def mail_boutique_reset_link(email: str, token: str) -> None:
    link = reset_link(token)
    subject = "Réinitialisation de votre mot de passe"
    html = wrap_email(
        "Mot de passe oublié",
        f"""
        <p>Vous avez demandé une réinitialisation de mot de passe.</p>
        <p>Cliquez ici (valable 2h) :</p>
        <p><a href="{link}">{link}</a></p>
        <p>Si vous n’êtes pas à l’origine de cette demande, ignorez cet email.</p>
        """
    )
    send_email(email, subject, html)
