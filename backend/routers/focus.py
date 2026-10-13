from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/focus", tags=["focus"])


@router.post("", response_model=schemas.FocusOut, status_code=status.HTTP_201_CREATED)
def record_session(
    data: schemas.FocusCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Save a completed focus session, optionally linked to one of your tasks."""
    if data.task_id is not None:
        owns = (
            db.query(models.Task.id)
            .filter(models.Task.id == data.task_id, models.Task.user_id == user.id)
            .first()
        )
        if not owns:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    session = models.FocusSession(user_id=user.id, task_id=data.task_id, minutes=data.minutes)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=list[schemas.FocusOut])
def list_sessions(
    days: int = Query(14, ge=1, le=365),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Your focus sessions from the last `days` days, newest first."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    return (
        db.query(models.FocusSession)
        .filter(models.FocusSession.user_id == user.id, models.FocusSession.completed_at >= since)
        .order_by(models.FocusSession.completed_at.desc())
        .all()
    )
