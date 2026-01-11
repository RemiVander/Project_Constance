from typing import Optional
from datetime import date, datetime, timedelta
import secrets
import string
import csv
import io

from fastapi import APIRouter, BackgroundTasks, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin, get_password_hash
from ..dependencies import get_db
from ..utils.mailer import send_boutique_password_email
from .common import templates, template_response, template_response

router = APIRouter()


class BoutiqueCreateRequest(BaseModel):
    nom: str
    email: EmailStr
    statut: Optional[str] = None
    numero_tva: Optional[str] = None


def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return date.fromisoformat(s)
    except Exception:
        return None


def _build_date_range(date_from: Optional[str], date_to: Optional[str]):
    d_from = _parse_date(date_from)
    d_to = _parse_date(date_to)
    dt_from = datetime.combine(d_from, datetime.min.time()) if d_from else None
    # Inclusif côté UI : on filtre < (date_to + 1 jour)
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )
    return d_from, d_to, dt_from, dt_to_excl


def _csv_stream(rows_iter, header):
    """
    CSV robuste pour Excel FR:
    - UTF-8 BOM
    - séparateur ';'
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    # BOM UTF-8 (Excel-friendly)
    yield "\ufeff"

    writer.writerow(header)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    for row in rows_iter:
        writer.writerow(row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


# ========= Boutiques =========

@router.get("/admin/boutiques")
def admin_boutiques(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutiques = db.query(models.Boutique).order_by(models.Boutique.nom).all()
    return template_response(
        "admin_boutiques_list.html",
        request,
        {
            "admin": admin,
            "boutiques": boutiques,
            "page": "boutiques",
            "sous_page": "boutiques",
        },
    )


@router.get("/admin/boutiques/create")
def boutique_create_form(
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    return template_response(
        "admin_boutique_create.html",
        request,
        {
            "admin": admin,
            "page": "boutiques",
        },
    )


@router.post("/admin/boutiques/create")
def boutique_create(
    request: Request,
    background_tasks: BackgroundTasks,
    nom: str = Form(...),
    email: str = Form(...),
    gerant: str = Form(""),
    telephone: str = Form(""),
    adresse: str = Form(""),
    numero_tva: str = Form(""),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    existing = db.query(models.Boutique).filter(models.Boutique.email == email).first()
    if existing:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    # Générer un mot de passe plus lisible (évite les caractères ambigus)
    alphabet = string.ascii_letters + string.digits  # Pas de caractères spéciaux
    plain_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    boutique = models.Boutique(
        nom=nom,
        email=email,
        gerant=gerant or None,
        telephone=telephone or None,
        adresse=adresse or None,
        numero_tva=numero_tva or None,
        mot_de_passe_hash=get_password_hash(plain_password),
        doit_changer_mdp=True,
    )
    db.add(boutique)
    db.commit()

    background_tasks.add_task(send_boutique_password_email, email, nom, plain_password)
    return RedirectResponse(url="/admin/boutiques", status_code=302)


@router.post("/admin/boutiques/{boutique_id}/statut")
def boutique_change_statut(
    boutique_id: int,
    request: Request,
    statut: str = Form(...),
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    try:
        boutique.statut = models.BoutiqueStatut(statut)
    except ValueError:
        return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)

    db.commit()
    return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)


@router.get("/admin/boutiques/{boutique_id}")
def boutique_detail(
    boutique_id: int,
    request: Request,
    devis_statut: Optional[str] = None,
    bc_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    d_from, d_to, dt_from, dt_to_excl = _build_date_range(date_from, date_to)

    devis_q = db.query(models.Devis).filter(models.Devis.boutique_id == boutique.id)
    if devis_statut and devis_statut != "ALL":
        try:
            devis_q = devis_q.filter(models.Devis.statut == models.StatutDevis(devis_statut))
        except Exception:
            pass
    if dt_from:
        devis_q = devis_q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        devis_q = devis_q.filter(models.Devis.date_creation < dt_to_excl)

    devis = devis_q.order_by(models.Devis.date_creation.desc()).all()

    total_ca = sum(d.prix_total for d in devis)
    nb_devis = len(devis)
    nb_acceptes = len([d for d in devis if d.statut == models.StatutDevis.ACCEPTE])
    taux_acceptation = (nb_acceptes / nb_devis * 100) if nb_devis else 0

    devis_statuts = [s.value for s in models.StatutDevis]
    bc_statuts = [s.value for s in models.StatutBonCommande]

    def _bc_matches(bc: models.BonCommande) -> bool:
        if not bc:
            return False
        if bc_statut and bc_statut != "ALL":
            try:
                if bc.statut != models.StatutBonCommande(bc_statut):
                    return False
            except Exception:
                pass
        if dt_from and bc.date_creation and bc.date_creation < dt_from:
            return False
        if dt_to_excl and bc.date_creation and bc.date_creation >= dt_to_excl:
            return False
        return True

    devis_with_bc_filtered = [
        d for d in devis if d.bon_commande and _bc_matches(d.bon_commande)
    ]

    return template_response(
        "admin_boutique_detail.html",
        request,
        {
            "admin": admin,
            "boutique": boutique,
            "devis": devis,
            "devis_with_bc": devis_with_bc_filtered,
            "total_ca": total_ca,
            "nb_devis": nb_devis,
            "nb_acceptes": nb_acceptes,
            "taux_acceptation": taux_acceptation,
            "filters": {
                "devis_statut": devis_statut or "ALL",
                "bc_statut": bc_statut or "ALL",
                "date_from": d_from.isoformat() if d_from else "",
                "date_to": d_to.isoformat() if d_to else "",
            },
            "devis_statuts": devis_statuts,
            "bc_statuts": bc_statuts,
            "page": "boutiques",
        },
    )


# =========================
# ✅ EXPORT CSV
# =========================

@router.get("/admin/boutiques/{boutique_id}/devis.csv")
def export_devis_csv(
    boutique_id: int,
    request: Request,
    devis_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    import re

    def _safe_filename(name: str) -> str:
        name = (name or "").strip().replace(" ", "_")
        name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
        name = re.sub(r"_+", "_", name).strip("_")
        return name or "export.csv"

    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    _, _, dt_from, dt_to_excl = _build_date_range(date_from, date_to)

    devis_q = db.query(models.Devis).filter(models.Devis.boutique_id == boutique.id)

    if devis_statut and devis_statut != "ALL":
        try:
            devis_q = devis_q.filter(
                models.Devis.statut == models.StatutDevis(devis_statut)
            )
        except Exception:
            pass

    if dt_from:
        devis_q = devis_q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        devis_q = devis_q.filter(models.Devis.date_creation < dt_to_excl)

    devis_q = devis_q.order_by(models.Devis.date_creation.desc())

    def rows():
        for d in devis_q.yield_per(500):
            ref = f"{boutique.nom}-#{d.numero_boutique}"
            dt = d.date_creation.strftime("%Y-%m-%d %H:%M") if d.date_creation else ""
            statut = d.statut.value if getattr(d.statut, "value", None) else str(d.statut)
            yield [dt, ref, statut, f"{d.prix_total:.2f}", str(d.id)]

    filename = _safe_filename(
        f"devis_{boutique.nom}_{date_from or 'all'}_{date_to or 'all'}.csv"
    )

    return StreamingResponse(
        _csv_stream(
            rows(),
            ["date_creation", "reference", "statut", "prix_total", "devis_id"],
        ),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/admin/boutiques/{boutique_id}/bons-commande.csv")
def export_bons_commande_csv(
    boutique_id: int,
    request: Request,
    bc_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    import re

    def _safe_filename(name: str) -> str:
        name = (name or "").strip().replace(" ", "_")
        name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
        name = re.sub(r"_+", "_", name).strip("_")
        return name or "export.csv"

    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    _, _, dt_from, dt_to_excl = _build_date_range(date_from, date_to)

    q = (
        db.query(models.BonCommande, models.Devis)
        .join(models.Devis, models.BonCommande.devis_id == models.Devis.id)
        .filter(models.Devis.boutique_id == boutique.id)
    )

    if bc_statut and bc_statut != "ALL":
        try:
            q = q.filter(models.BonCommande.statut == models.StatutBonCommande(bc_statut))
        except Exception:
            pass

    if dt_from:
        q = q.filter(models.BonCommande.date_creation >= dt_from)
    if dt_to_excl:
        q = q.filter(models.BonCommande.date_creation < dt_to_excl)

    q = q.order_by(models.BonCommande.date_creation.desc())

    def rows():
        for bc, d in q.yield_per(500):
            ref = f"{boutique.nom}-#{d.numero_boutique}"
            dt = bc.date_creation.strftime("%Y-%m-%d %H:%M") if bc.date_creation else ""
            statut = bc.statut.value if getattr(bc.statut, "value", None) else str(bc.statut)

            commentaire_admin = (getattr(bc, "commentaire_admin", None) or "").replace("\n", "\\n")
            commentaire_boutique = (getattr(bc, "commentaire_boutique", None) or "").replace("\n", "\\n")

            yield [
                dt,
                ref,
                statut,
                f"{(bc.montant_boutique_ht or 0):.2f}",
                f"{(bc.montant_boutique_ttc or 0):.2f}",
                "1" if getattr(bc, "has_tva", False) else "0",
                commentaire_admin,
                commentaire_boutique,
                str(bc.id),
                str(d.id),
            ]

    filename = _safe_filename(
        f"bons_commande_{boutique.nom}_{date_from or 'all'}_{date_to or 'all'}.csv"
    )

    return StreamingResponse(
        _csv_stream(
            rows(),
            [
                "date_creation",
                "reference",
                "statut",
                "montant_boutique_ht",
                "montant_boutique_ttc",
                "has_tva",
                "commentaire_admin",
                "commentaire_boutique",
                "bon_commande_id",
                "devis_id",
            ],
        ),
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/admin/boutiques/{boutique_id}/edit", response_class=HTMLResponse)
def boutique_edit_form(
    boutique_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    return template_response(
        "admin_boutique_edit.html",
        request,
        {
            "admin": admin,
            "boutique": boutique,
            "page": "boutiques",
        },
    )


@router.post("/admin/boutiques/{boutique_id}/edit")
def boutique_edit(
    boutique_id: int,
    request: Request,
    nom: str = Form(...),
    email: str = Form(...),
    gerant: str = Form(""),
    telephone: str = Form(""),
    adresse: str = Form(""),
    numero_tva: str = Form(""),
    db: Session = Depends(get_db),
):
    boutique = db.query(models.Boutique).get(boutique_id)
    if not boutique:
        return RedirectResponse(url="/admin/boutiques", status_code=302)

    boutique.nom = nom
    boutique.email = email
    boutique.gerant = gerant or None
    boutique.telephone = telephone or None
    boutique.adresse = adresse or None
    boutique.numero_tva = numero_tva or None

    db.commit()
    return RedirectResponse(url=f"/admin/boutiques/{boutique_id}", status_code=302)


@router.post("/admin/boutiques")
def create_boutique(
    payload: BoutiqueCreateRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    boutique = models.Boutique(
        nom=payload.nom,
        email=payload.email,
        statut=payload.statut,
        numero_tva=payload.numero_tva,
    )

    # Générer un mot de passe plus lisible (évite les caractères ambigus)
    alphabet = string.ascii_letters + string.digits  # Pas de caractères spéciaux
    temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
    boutique.mot_de_passe_hash = get_password_hash(temp_password)
    boutique.doit_changer_mdp = True
    db.add(boutique)
    db.commit()

    background_tasks.add_task(
        send_boutique_password_email,
        boutique.email,
        boutique.nom,
        temp_password,
    )

    return {"ok": True, "boutique": boutique}
