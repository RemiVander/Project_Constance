import secrets
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_password_hash, verify_password, get_current_admin
from ..utils.mailer import _send, wrap_email
from ..dependencies import get_db
from .common import templates, template_response

router = APIRouter()


# Tokens de reset stockés en mémoire (en production, utiliser Redis ou base de données)
RESET_TOKENS: dict[str, dict] = {}


def generate_reset_token() -> str:
    """Génère un token de reset unique."""
    return secrets.token_urlsafe(32)


@router.get("/admin/reset-password")
def reset_password_page(request: Request):
    """Page de demande de reset de mot de passe."""
    error = request.query_params.get("error")
    success = request.query_params.get("success")
    
    error_msg = None
    if error == "not_found":
        error_msg = "Aucun compte admin trouvé avec cet email."
    elif error == "invalid_token":
        error_msg = "Lien de réinitialisation invalide ou expiré."
    
    success_msg = None
    if success:
        success_msg = "Un email avec les instructions de réinitialisation a été envoyé."

    return template_response(
        "admin_reset_password.html",
        request,
        {
            "error": error_msg,
            "success": success_msg,
        },
    )


@router.post("/admin/reset-password-request")
def reset_password_request(
    request: Request,
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    """Traitement de la demande de reset de mot de passe."""
    # Chercher l'admin par email
    admin = (
        db.query(models.User)
        .filter_by(email=email, type=models.UserType.ADMIN)
        .first()
    )
    
    if not admin:
        # Ne pas révéler si l'email existe ou non (sécurité)
        return RedirectResponse(url="/admin/reset-password?success=1", status_code=302)
    
    # Générer un token
    token = generate_reset_token()
    expires_at = datetime.utcnow() + timedelta(hours=2)  # Valide 2h
    
    RESET_TOKENS[token] = {
        "admin_id": admin.id,
        "email": admin.email,
        "expires_at": expires_at,
    }
    
    # Construire le lien de reset
    from ..config import BASE_URL
    base_url = BASE_URL.rstrip("/") if BASE_URL else str(request.base_url).rstrip("/")
    reset_link = f"{base_url}/admin/reset-password-confirm?token={token}"
    
    # Envoyer l'email
    subject = "Réinitialisation de votre mot de passe admin"
    text = f"""Bonjour {admin.nom},

Vous avez demandé une réinitialisation de votre mot de passe admin.

Lien de réinitialisation (valable 2 heures) :
{reset_link}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

Cordialement,
Constance Cellier
"""
    html = wrap_email(
        "Réinitialisation de mot de passe admin",
        f"""
        <p>Bonjour <b>{admin.nom}</b>,</p>
        <p>Vous avez demandé une réinitialisation de votre mot de passe admin.</p>
        <p><b>Lien de réinitialisation</b> (valable 2 heures) :</p>
        <p><a href="{reset_link}" style="color:#2563eb;text-decoration:underline;">{reset_link}</a></p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
        """
    )
    
    _send(admin.email, subject, text, html)
    
    return RedirectResponse(url="/admin/reset-password?success=1", status_code=302)


@router.get("/admin/reset-password-confirm")
def reset_password_confirm_page(request: Request):
    """Page de confirmation de reset avec token."""
    token = request.query_params.get("token")
    
    if not token or token not in RESET_TOKENS:
        return RedirectResponse(url="/admin/reset-password?error=invalid_token", status_code=302)
    
    token_data = RESET_TOKENS[token]
    if datetime.utcnow() > token_data["expires_at"]:
        del RESET_TOKENS[token]
        return RedirectResponse(url="/admin/reset-password?error=invalid_token", status_code=302)
    
    error = request.query_params.get("error")
    error_msg = None
    if error == "password_mismatch":
        error_msg = "Les mots de passe ne correspondent pas."
    elif error == "password_weak":
        error_msg = "Le mot de passe doit contenir au moins 6 caractères."
    
    return template_response(
        "admin_reset_password_confirm.html",
        request,
        {
            "token": token,
            "error": error_msg,
        },
    )


@router.post("/admin/reset-password-confirm")
def reset_password_confirm(
    request: Request,
    token: str = Form(...),
    nouveau_mot_de_passe: str = Form(...),
    confirmer_mot_de_passe: str = Form(...),
    db: Session = Depends(get_db),
):
    """Traitement de la confirmation de reset."""
    # Vérifier le token
    if not token or token not in RESET_TOKENS:
        return RedirectResponse(url="/admin/reset-password?error=invalid_token", status_code=302)
    
    token_data = RESET_TOKENS[token]
    if datetime.utcnow() > token_data["expires_at"]:
        del RESET_TOKENS[token]
        return RedirectResponse(url="/admin/reset-password?error=invalid_token", status_code=302)
    
    # Vérifier les mots de passe
    if nouveau_mot_de_passe != confirmer_mot_de_passe:
        return RedirectResponse(
            url=f"/admin/reset-password-confirm?token={token}&error=password_mismatch",
            status_code=302,
        )
    
    if len(nouveau_mot_de_passe) < 6:
        return RedirectResponse(
            url=f"/admin/reset-password-confirm?token={token}&error=password_weak",
            status_code=302,
        )
    
    # Mettre à jour le mot de passe
    admin_id = token_data["admin_id"]
    admin = db.query(models.User).filter_by(id=admin_id).first()
    
    if not admin:
        del RESET_TOKENS[token]
        return RedirectResponse(url="/admin/reset-password?error=invalid_token", status_code=302)
    
    admin.mot_de_passe = get_password_hash(nouveau_mot_de_passe)
    db.commit()
    
    # Supprimer le token utilisé
    del RESET_TOKENS[token]
    
    return RedirectResponse(url="/admin/login?success=password_reset", status_code=302)


@router.get("/admin/change-password")
def change_password_page(
    request: Request,
    admin: models.User = Depends(get_current_admin),
):
    """Page de changement de mot de passe (pour admin connecté)."""
    error = request.query_params.get("error")
    success = request.query_params.get("success")
    
    error_msg = None
    if error == "wrong_password":
        error_msg = "Le mot de passe actuel est incorrect."
    elif error == "password_mismatch":
        error_msg = "Les nouveaux mots de passe ne correspondent pas."
    elif error == "password_weak":
        error_msg = "Le nouveau mot de passe doit contenir au moins 6 caractères."
    elif error == "same_password":
        error_msg = "Le nouveau mot de passe doit être différent de l'actuel."
    
    success_msg = None
    if success:
        success_msg = "Votre mot de passe a été modifié avec succès."
    
    return template_response(
        "admin_change_password.html",
        request,
        {
            "admin": admin,
            "error": error_msg,
            "success": success_msg,
            "page": "change-password",
        },
    )


@router.post("/admin/change-password")
def change_password(
    request: Request,
    mot_de_passe_actuel: str = Form(...),
    nouveau_mot_de_passe: str = Form(...),
    confirmer_mot_de_passe: str = Form(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    """Traitement du changement de mot de passe."""
    # Vérifier le mot de passe actuel
    if not verify_password(mot_de_passe_actuel, admin.mot_de_passe):
        return RedirectResponse(
            url="/admin/change-password?error=wrong_password",
            status_code=302,
        )
    
    # Vérifier que le nouveau mot de passe est différent
    if verify_password(nouveau_mot_de_passe, admin.mot_de_passe):
        return RedirectResponse(
            url="/admin/change-password?error=same_password",
            status_code=302,
        )
    
    # Vérifier les nouveaux mots de passe
    if nouveau_mot_de_passe != confirmer_mot_de_passe:
        return RedirectResponse(
            url="/admin/change-password?error=password_mismatch",
            status_code=302,
        )
    
    if len(nouveau_mot_de_passe) < 6:
        return RedirectResponse(
            url="/admin/change-password?error=password_weak",
            status_code=302,
        )
    
    # Mettre à jour le mot de passe
    admin.mot_de_passe = get_password_hash(nouveau_mot_de_passe)
    db.commit()
    
    return RedirectResponse(url="/admin/change-password?success=1", status_code=302)
