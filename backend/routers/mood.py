from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/mood", tags=["mood"])


def _out(entry: models.MoodEntry) -> dict:
    return {
        "date": entry.date,
        "mood": entry.mood,
        "tags": [t for t in entry.tags.split(",") if t],
        "note": entry.note,
    }


def _find(db: Session, user: models.User, day: date) -> models.MoodEntry | None:
    return (
        db.query(models.MoodEntry)
        .filter(models.MoodEntry.user_id == user.id, models.MoodEntry.date == day)
        .first()
    )


@router.get("", response_model=list[schemas.MoodOut])
def list_entries(
    start: date,
    end: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Your check-ins between start and end (inclusive), oldest first."""
    if end < start or (end - start).days > 366:
        raise HTTPException(status_code=400, detail="Choose a date range of at most a year")
    entries = (
        db.query(models.MoodEntry)
        .filter(
            models.MoodEntry.user_id == user.id,
            models.MoodEntry.date >= start,
            models.MoodEntry.date <= end,
        )
        .order_by(models.MoodEntry.date)
        .all()
    )
    return [_out(e) for e in entries]


@router.put("/{day}", response_model=schemas.MoodOut)
def save_entry(
    day: date,
    data: schemas.MoodSet,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Create or replace your check-in for a day. Safe to repeat."""
    # The client decides what "today" is in its own timezone, so allow one day of slack.
    if day > datetime.now(timezone.utc).date() + timedelta(days=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't check in for a future day")

    tags = ",".join(dict.fromkeys(data.tags))  # drop duplicates, keep order
    note = (data.note or "").strip() or None

    entry = _find(db, user, day)
    if entry:
        entry.mood, entry.tags, entry.note = data.mood, tags, note
    else:
        entry = models.MoodEntry(user_id=user.id, date=day, mood=data.mood, tags=tags, note=note)
        db.add(entry)
    db.commit()
    db.refresh(entry)
    return _out(entry)


@router.delete("/{day}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(
    day: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    entry = _find(db, user, day)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No check-in for that day")
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)