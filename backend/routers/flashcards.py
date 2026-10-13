from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

MAX_BOX = 5
# Leitner boxes: the box a card moves INTO decides how long until you see it again.
BOX_DAYS = {2: 1, 3: 3, 4: 7, 5: 14}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _own_deck(deck_id: int, user: models.User, db: Session) -> models.Deck:
    deck = (
        db.query(models.Deck)
        .filter(models.Deck.id == deck_id, models.Deck.user_id == user.id)
        .first()
    )
    if not deck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Deck not found")
    return deck


def _own_card(card_id: int, user: models.User, db: Session) -> models.Card:
    card = (
        db.query(models.Card)
        .filter(models.Card.id == card_id, models.Card.user_id == user.id)
        .first()
    )
    if not card:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return card


def _counts(db: Session, user: models.User) -> dict[int, tuple[int, int, int]]:
    """deck_id -> (total, due, mastered) for all of the user's decks in one query."""
    now = _now()
    rows = (
        db.query(
            models.Card.deck_id,
            func.count(models.Card.id),
            func.coalesce(func.sum(case((models.Card.due_at <= now, 1), else_=0)), 0),
            func.coalesce(func.sum(case((models.Card.box >= MAX_BOX, 1), else_=0)), 0),
        )
        .filter(models.Card.user_id == user.id)
        .group_by(models.Card.deck_id)
        .all()
    )
    return {r[0]: (int(r[1]), int(r[2]), int(r[3])) for r in rows}


def _deck_out(deck: models.Deck, counts: dict) -> dict:
    total, due, mastered = counts.get(deck.id, (0, 0, 0))
    return {
        "id": deck.id,
        "name": deck.name,
        "subject": deck.subject,
        "color": deck.color,
        "card_count": total,
        "due_count": due,
        "mastered_count": mastered,
        "created_at": deck.created_at,
    }


# ---------- Decks ----------
@router.get("/decks", response_model=list[schemas.DeckOut])
def list_decks(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    decks = (
        db.query(models.Deck)
        .filter(models.Deck.user_id == user.id)
        .order_by(models.Deck.id.desc())
        .all()
    )
    counts = _counts(db, user)
    return [_deck_out(d, counts) for d in decks]


@router.post("/decks", response_model=schemas.DeckOut, status_code=status.HTTP_201_CREATED)
def create_deck(
    data: schemas.DeckCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = models.Deck(**data.model_dump(), user_id=user.id)
    db.add(deck)
    db.commit()
    db.refresh(deck)
    return _deck_out(deck, {})


@router.patch("/decks/{deck_id}", response_model=schemas.DeckOut)
def update_deck(
    deck_id: int,
    data: schemas.DeckUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = _own_deck(deck_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    if updates.get("name", "x") is None or updates.get("color", "x") is None:
        raise HTTPException(status_code=422, detail="name and color cannot be null")
    for field, value in updates.items():
        setattr(deck, field, value)
    db.commit()
    db.refresh(deck)
    return _deck_out(deck, _counts(db, user))


@router.delete("/decks/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_deck(
    deck_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = _own_deck(deck_id, user, db)
    db.query(models.Card).filter(models.Card.deck_id == deck.id).delete()
    db.delete(deck)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------- Cards ----------
@router.get("/decks/{deck_id}/cards", response_model=list[schemas.CardOut])
def list_cards(
    deck_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = _own_deck(deck_id, user, db)
    return (
        db.query(models.Card)
        .filter(models.Card.deck_id == deck.id, models.Card.user_id == user.id)
        .order_by(models.Card.id)
        .all()
    )


@router.post(
    "/decks/{deck_id}/cards", response_model=schemas.CardOut, status_code=status.HTTP_201_CREATED
)
def create_card(
    deck_id: int,
    data: schemas.CardCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = _own_deck(deck_id, user, db)
    card = models.Card(deck_id=deck.id, user_id=user.id, **data.model_dump())
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.post(
    "/decks/{deck_id}/cards/bulk",
    response_model=list[schemas.CardOut],
    status_code=status.HTTP_201_CREATED,
)
def create_cards_bulk(
    deck_id: int,
    data: schemas.CardBulk,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    deck = _own_deck(deck_id, user, db)
    cards = [models.Card(deck_id=deck.id, user_id=user.id, **c.model_dump()) for c in data.cards]
    db.add_all(cards)
    db.commit()
    for c in cards:
        db.refresh(c)
    return cards


@router.patch("/cards/{card_id}", response_model=schemas.CardOut)
def update_card(
    card_id: int,
    data: schemas.CardUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    card = _own_card(card_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    if updates.get("front", "x") is None or updates.get("back", "x") is None:
        raise HTTPException(status_code=422, detail="front and back cannot be null")
    for field, value in updates.items():
        setattr(card, field, value.strip())
    db.commit()
    db.refresh(card)
    return card


@router.delete("/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    card = _own_card(card_id, user, db)
    db.delete(card)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/cards/{card_id}/review", response_model=schemas.CardOut)
def review_card(
    card_id: int,
    data: schemas.ReviewIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Got it: move up a box and wait longer. Missed it: back to box 1, due right away."""
    card = _own_card(card_id, user, db)
    card.reviews += 1
    if data.correct:
        card.box = min(card.box + 1, MAX_BOX)
        card.due_at = _now() + timedelta(days=BOX_DAYS[card.box])
    else:
        card.box = 1
        card.due_at = _now()
    db.commit()
    db.refresh(card)
    return card