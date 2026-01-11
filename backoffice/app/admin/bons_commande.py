from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Form, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin
from ..dependencies import get_db
from ..utils.mailer import send_admin_bc_notification, send_boutique_bc_notification
from .common import templates, template_response


try:
    from ..timeline import create_event  
except Exception:  
    create_event = None 

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

    new_statut = str(bon.statut)
    new_comment = bon.commentaire_admin or ""
    changed = (new_statut != old_statut) or (new_comment != old_comment)

    if changed and create_event:
        try:
            create_event(
                db,
                bon_commande_id=bon.id,
                actor_type="ADMIN",
                actor_id=getattr(admin, "id", None),
                event_type="BC_MAJ_ADMIN",
                message=new_comment or f"Statut: {new_statut}",
            )
        except Exception:
            pass

    db.commit()

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

        elif "VALIDE" in new_statut:
            subject_b = f"Bon de commande validé — {ref}"
            html_b = f"""
            <p>Votre bon de commande a été <b>validé</b>.</p>
            <p><b>Référence :</b> {ref}</p>
            """
            text_b = f"Votre BC {ref} a été validé."
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

    if bon.statut != models.StatutBonCommande.EN_ATTENTE_VALIDATION:
        raise HTTPException(
            status_code=400,
            detail="Ce bon de commande n'est pas en attente de validation.",
        )

    bon.statut = models.StatutBonCommande.A_MODIFIER
    bon.commentaire_admin = commentaire_admin.strip() or None

    if create_event:
        try:
            create_event(
                db,
                bon_commande_id=bon.id,
                actor_type="ADMIN",
                actor_id=getattr(admin, "id", None),
                event_type="BC_RENVOYE",
                message=bon.commentaire_admin,
            )
        except Exception:
            pass

    db.commit()

    ref = f"{bon.devis.boutique.nom}-{bon.devis.numero_boutique}"

    subject_b = f"Bon de commande à modifier — {ref}"
    html_b = f"""
    <p>Votre bon de commande nécessite une modification.</p>
    <p><b>Référence :</b> {ref}</p>
    <p><b>Commentaire de l'admin :</b></p>
    <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
        {bon.commentaire_admin or "—"}
    </div>
    <p>Merci de corriger puis de revalider le bon de commande depuis votre espace.</p>
    """
    text_b = (
        f"Votre bon de commande {ref} nécessite une modification.\n"
        f"Commentaire admin : {bon.commentaire_admin or '—'}"
    )

    background_tasks.add_task(
        send_boutique_bc_notification,
        bon.devis.boutique.email,
        subject_b,
        html_b,
        text_b,
    )

    _ = admin
    return {"ok": True}


class DecisionBCPayload(BaseModel):
    decision: Literal["VALIDE", "ACCEPTE", "REFUSE"]
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

    if bon.statut != models.StatutBonCommande.EN_ATTENTE_VALIDATION:
        raise HTTPException(
            status_code=400,
            detail="Ce bon de commande n'est pas en attente de validation.",
        )

    decision = payload.decision
    if decision == "ACCEPTE":
        decision = "VALIDE"

    bon.statut = (
        models.StatutBonCommande.VALIDE
        if decision == "VALIDE"
        else models.StatutBonCommande.REFUSE
    )

    bon.commentaire_admin = payload.commentaire.strip() if payload.commentaire else None

    if create_event:
        try:
            create_event(
                db,
                bon_commande_id=bon.id,
                actor_type="ADMIN",
                actor_id=getattr(admin, "id", None),
                event_type="BC_VALIDE" if bon.statut == models.StatutBonCommande.VALIDE else "BC_REFUSE",
                message=bon.commentaire_admin,
            )
        except Exception:
            pass

    db.commit()

    ref = f"{bon.devis.boutique.nom}-{bon.devis.numero_boutique}"

    subject = f"Bon de commande {decision.lower()} — {ref}"
    html = f"""
    <p>Votre bon de commande <b>{ref}</b> a été <b>{decision.lower()}</b>.</p>
    <p><b>Commentaire admin :</b></p>
    <div style="white-space:pre-wrap;border:1px solid #eee;padding:12px;border-radius:8px;">
        {bon.commentaire_admin or "—"}
    </div>
    """
    text = f"Bon de commande {ref} {decision.lower()}.\nCommentaire admin : {bon.commentaire_admin or '—'}"

    background_tasks.add_task(
        send_boutique_bc_notification,
        bon.devis.boutique.email,
        subject,
        html,
        text,
    )

    _ = admin
    return {"ok": True}

@router.get("/admin/bons-commande/{bon_id}/timeline")
def admin_bc_timeline(
    bon_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    bon = db.query(models.BonCommande).get(bon_id)
    if not bon:
        raise HTTPException(status_code=404, detail="Bon de commande introuvable")

    boutique = bon.devis.boutique
    ref = f"{boutique.nom}-{bon.devis.numero_boutique}"

    events = []
    try:
        from ..timeline_models import BonCommandeEvent 

        events = (
            db.query(BonCommandeEvent)
            .filter(BonCommandeEvent.bon_commande_id == bon.id)
            .order_by(BonCommandeEvent.created_at.asc(), BonCommandeEvent.id.asc())
            .all()
        )
    except Exception:
        events = []

    return template_response(
        "admin_bon_commande_timeline.html",
        request,
        {
            "admin": admin,
            "bon": bon,
            "boutique": boutique,
            "events": events,
            "ref": ref,
            "page": "boutiques",
        },
    )

