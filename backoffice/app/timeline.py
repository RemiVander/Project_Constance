from typing import Optional

from sqlalchemy.orm import Session

from .timeline_models import BonCommandeEvent


def create_event(
    db: Session,
    bon_commande_id: int,
    actor_type: str,
    actor_id: Optional[int],
    event_type: str,
    message: Optional[str] = None,
) -> BonCommandeEvent:
    ev = BonCommandeEvent(
        bon_commande_id=bon_commande_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        message=message.strip() if isinstance(message, str) and message.strip() else None,
    )
    db.add(ev)
    return ev


def list_events(db: Session, bon_commande_id: int):
    return (
        db.query(BonCommandeEvent)
        .filter(BonCommandeEvent.bon_commande_id == bon_commande_id)
        .order_by(BonCommandeEvent.created_at.asc(), BonCommandeEvent.id.asc())
        .all()
    )
