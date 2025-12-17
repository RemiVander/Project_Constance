from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin
from ..dependencies import get_db
from ..utils.mailer import send_admin_bc_notification, send_boutique_bc_notification

router = APIRouter()

@router.post("/admin/bons-commande/{bon_id}/update")
def admin_update_bon_commande(
    bon_id: int,
    request: Request,
    statut: str = Form(...),
    commentaire_admin: str = Form(""),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    bon = db.query(models.BonCommande).get(bon_id)
    if not bon:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    old_statut = str(bon.statut)
    old_comment = bon.commentaire_admin or ""

    try:
        if hasattr(models, "StatutBonCommande"):
            bon.statut = models.StatutBonCommande(statut)
        else:
            bon.statut = statut
    except Exception:
        pass

    bon.commentaire_admin = commentaire_admin.strip() or None

    db.commit()

    new_statut = str(bon.statut)
    new_comment = bon.commentaire_admin or ""
    changed = (new_statut != old_statut) or (new_comment != old_comment)

    if changed and background_tasks:
        ref = f"{bon.devis.boutique.nom}-{bon.devis.numero_boutique}"
        to_email = bon.devis.boutique.email

        if "A_MODIFIER" in new_statut:
            subject_b = f"Bon de commande à corriger — {ref}"
            html_b = f"""
            <p>Votre bon de commande a été renvoyé pour <b>modification</b>.</p>
            <p><b>Référence :</b> {ref}</p>
            <p><b>Commentaire de l’atelier :</b></p>
            <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
                {new_comment or "—"}
            </div>
            """
            text_b = f"Votre BC {ref} a été renvoyé pour correction.\nCommentaire de l’atelier : {new_comment or '—'}"
            background_tasks.add_task(send_boutique_bc_notification, to_email, subject_b, html_b, text_b)

        elif "REFUSE" in new_statut:
            subject_b = f"Bon de commande refusé — {ref}"
            html_b = f"""
            <p>Votre bon de commande a été <b>refusé</b>.</p>
            <p><b>Référence :</b> {ref}</p>
            <p><b>Commentaire de l’atelier :</b></p>
            <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
                {new_comment or "—"}
            </div>
            """
            text_b = f"Votre BC {ref} a été refusé.\nCommentaire de l’atelier : {new_comment or '—'}"
            background_tasks.add_task(send_boutique_bc_notification, to_email, subject_b, html_b, text_b)

        elif "ACCEPTE" in new_statut:
            subject_b = f"Bon de commande accepté — {ref}"
            html_b = f"""
            <p>Votre bon de commande a été <b>accepté</b>.</p>
            <p><b>Référence :</b> {ref}</p>
            """
            text_b = f"Votre BC {ref} a été accepté."
            background_tasks.add_task(send_boutique_bc_notification, to_email, subject_b, html_b, text_b)

    return RedirectResponse(
        url=f"/admin/boutiques/{bon.devis.boutique_id}",
        status_code=302,
    )

@router.post("/admin/bons-commande/{bon_id}/renvoyer")
def renvoyer_bc(
    bon_id: int,
    background_tasks: BackgroundTasks,
    commentaire_admin: str = Form(""),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    bon = db.query(models.BonCommande).get(bon_id)
    if not bon:
        raise HTTPException(status_code=404, detail="Bon de commande introuvable")

    bon.statut = models.StatutBonCommande.EN_ATTENTE_VALIDATION
    bon.commentaire_admin = commentaire_admin.strip() or None
    db.commit()

    ref = f"{bon.devis.boutique.nom}-{bon.devis.numero_boutique}"

    subject_admin = f"BC renvoyé à la boutique — {ref}"
    html_admin = f"""
    <p>Un bon de commande a été renvoyé à la boutique <b>{bon.devis.boutique.nom}</b>.</p>
    <p><b>Référence :</b> {ref}</p>
    <p><b>Commentaire admin envoyé :</b></p>
    <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
        {bon.commentaire_admin or "—"}
    </div>
    """
    text_admin = (
        f"BC renvoyé à la boutique {bon.devis.boutique.nom} ({ref})\n"
        f"Commentaire admin : {bon.commentaire_admin or '—'}"
    )

    background_tasks.add_task(
        send_admin_bc_notification,
        subject_admin,
        html_admin,
        text_admin,
    )

    return {"ok": True}

class DecisionBCPayload(BaseModel):
    decision: Literal["ACCEPTE", "REFUSE"]
    commentaire: Optional[str] = None



@router.post("/admin/bons-commande/{bon_id}/decision")
def decision_bc(
    bon_id: int,
    payload: DecisionBCPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    bon = db.query(models.BonCommande).get(bon_id)
    if not bon:
        raise HTTPException(status_code=404, detail="Bon de commande introuvable")

    bon.statut = (
        models.StatutBonCommande.ACCEPTE
        if payload.decision == "ACCEPTE"
        else models.StatutBonCommande.REFUSE
    )

    bon.commentaire_admin = payload.commentaire.strip() if payload.commentaire else None
    db.commit()

    ref = f"{bon.devis.boutique.nom}-{bon.devis.numero_boutique}"

    subject = f"Bon de commande {payload.decision.lower()} — {ref}"
    html = f"""
    <p>Votre bon de commande <b>{ref}</b> a été <b>{payload.decision.lower()}</b>.</p>
    <p><b>Commentaire admin :</b></p>
    <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
        {bon.commentaire_admin or "—"}
    </div>
    """
    text = f"Bon de commande {ref} {payload.decision.lower()}.\nCommentaire admin : {bon.commentaire_admin or '—'}"

    background_tasks.add_task(
        send_boutique_bc_notification,
        bon.devis.boutique.email,
        subject,
        html,
        text,
    )

    return {"ok": True}
