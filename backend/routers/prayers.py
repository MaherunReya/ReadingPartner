from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/prayers", tags=["prayers"])


@router.get("", response_model=list[schemas.PrayerLogOut])
def list_prayers(
    start: date,
    end: date,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Prayers marked as prayed between start and end (inclusive)."""
    if end < start or (end - start).days > 366:
        raise HTTPException(status_code=400, detail="Choose a date range of at most a year")
    return (
        db.query(models.PrayerLog)
        .filter(
            models.PrayerLog.user_id == user.id,
            models.PrayerLog.date >= start,
            models.PrayerLog.date <= end,
        )
        .order_by(models.PrayerLog.date)
        .all()
    )


@router.put("/{day}/{prayer}", response_model=schemas.PrayerState)
def set_prayer(
    day: date,
    prayer: schemas.PrayerName,
    data: schemas.PrayerToggle,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Mark a prayer as prayed (completed=true) or not (completed=false). Safe to repeat."""
    # The client decides what "today" is in its own timezone, so allow one day of slack.
    if day > datetime.now(timezone.utc).date() + timedelta(days=1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't log a future day")

    existing = (
        db.query(models.PrayerLog)
        .filter(
            models.PrayerLog.user_id == user.id,
            models.PrayerLog.date == day,
            models.PrayerLog.prayer == prayer,
        )
        .first()
    )
    if data.completed and not existing:
        db.add(models.PrayerLog(user_id=user.id, date=day, prayer=prayer))
        try:
            db.commit()
        except IntegrityError:  # double click / race: it's already logged
            db.rollback()
    elif not data.completed and existing:
        db.delete(existing)
        db.commit()
    return {"date": day, "prayer": prayer, "completed": data.completed}