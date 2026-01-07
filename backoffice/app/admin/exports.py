from typing import Optional
from datetime import date, datetime, timedelta
import csv
import io
import re

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import models
from ..auth import get_current_admin
from ..dependencies import get_db

router = APIRouter()


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
    dt_to_excl = (
        datetime.combine(d_to + timedelta(days=1), datetime.min.time())
        if d_to
        else None
    )
    return dt_from, dt_to_excl


def _safe_filename(name: str) -> str:
    """
    Rend un filename robuste (Windows / Linux / navigateurs) :
    - remplace espaces + caractères spéciaux par "_"
    - garde a-zA-Z0-9._- uniquement
    """
    name = (name or "").strip().replace(" ", "_")
    name = re.sub(r"[^a-zA-Z0-9._-]+", "_", name)
    name = re.sub(r"_+", "_", name).strip("_")
    return name or "export.csv"


def _csv_stream(rows_iter, header):
    """
    CSV Excel-friendly FR:
    - UTF-8 BOM
    - séparateur ';'
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

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


@router.get("/admin/exports/devis.csv")
def export_devis_global_csv(
    request: Request,
    devis_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    boutique_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    dt_from, dt_to_excl = _build_date_range(date_from, date_to)

    q = (
        db.query(models.Devis, models.Boutique)
        .join(models.Boutique, models.Devis.boutique_id == models.Boutique.id)
    )

    if boutique_id:
        q = q.filter(models.Boutique.id == boutique_id)

    if devis_statut and devis_statut != "ALL":
        try:
            q = q.filter(models.Devis.statut == models.StatutDevis(devis_statut))
        except Exception:
            pass

    if dt_from:
        q = q.filter(models.Devis.date_creation >= dt_from)
    if dt_to_excl:
        q = q.filter(models.Devis.date_creation < dt_to_excl)

    q = q.order_by(models.Devis.date_creation.desc())

    def rows():
        for d, b in q.yield_per(500):
            ref = f"{b.nom}-#{d.numero_boutique}"
            dt = d.date_creation.strftime("%Y-%m-%d %H:%M") if d.date_creation else ""
            statut = d.statut.value if getattr(d.statut, "value", None) else str(d.statut)
            yield [
                dt,
                str(b.id),
                b.nom,
                ref,
                statut,
                f"{d.prix_total:.2f}",
                str(d.id),
            ]

    filename = _safe_filename(f"devis_global_{date_from or 'all'}_{date_to or 'all'}.csv")

    return StreamingResponse(
        _csv_stream(
            rows(),
            [
                "date_creation",
                "boutique_id",
                "boutique_nom",
                "reference",
                "statut",
                "prix_total",
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


@router.get("/admin/exports/bons-commande.csv")
def export_bc_global_csv(
    request: Request,
    bc_statut: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    boutique_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: models.User = Depends(get_current_admin),
):
    dt_from, dt_to_excl = _build_date_range(date_from, date_to)

    q = (
        db.query(models.BonCommande, models.Devis, models.Boutique)
        .join(models.Devis, models.BonCommande.devis_id == models.Devis.id)
        .join(models.Boutique, models.Devis.boutique_id == models.Boutique.id)
    )

    if boutique_id:
        q = q.filter(models.Boutique.id == boutique_id)

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
        for bc, d, b in q.yield_per(500):
            ref = f"{b.nom}-#{d.numero_boutique}"
            dt = bc.date_creation.strftime("%Y-%m-%d %H:%M") if bc.date_creation else ""
            statut = bc.statut.value if getattr(bc.statut, "value", None) else str(bc.statut)

            com_admin = (getattr(bc, "commentaire_admin", None) or "").replace("\n", "\\n")
            com_bout = (getattr(bc, "commentaire_boutique", None) or "").replace("\n", "\\n")

            yield [
                dt,
                str(b.id),
                b.nom,
                ref,
                statut,
                f"{(bc.montant_boutique_ht or 0):.2f}",
                f"{(bc.montant_boutique_ttc or 0):.2f}",
                "1" if getattr(bc, "has_tva", False) else "0",
                com_admin,
                com_bout,
                str(bc.id),
                str(d.id),
            ]

    filename = _safe_filename(f"bons_commande_global_{date_from or 'all'}_{date_to or 'all'}.csv")

    return StreamingResponse(
        _csv_stream(
            rows(),
            [
                "date_creation",
                "boutique_id",
                "boutique_nom",
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
