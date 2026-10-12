from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/focus", tags=["focus"])


@router.post("", response_model=schemas.FocusSessionOut, status_code=status.HTTP_201_CREATED)
def log_session(
    data: schemas.FocusSessionCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Record a finished focus session."""
    session = models.FocusSession(user_id=user.id, minutes=data.minutes, subject=data.subject)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=list[schemas.FocusSessionOut])
def list_sessions(
    days: int = Query(30, ge=1, le=366),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Focus sessions from the last `days` days, newest first."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(models.FocusSession)
        .filter(models.FocusSession.user_id == user.id, models.FocusSession.completed_at >= since)
        .order_by(models.FocusSession.completed_at.desc())
        .all()
    )