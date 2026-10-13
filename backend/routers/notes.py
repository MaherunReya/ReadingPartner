from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


def _get_own_note(note_id: int, user: models.User, db: Session) -> models.Note:
    note = (
        db.query(models.Note)
        .filter(models.Note.id == note_id, models.Note.user_id == user.id)
        .first()
    )
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
    return note


@router.get("", response_model=list[schemas.NoteOut])
def list_notes(
    subject: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = db.query(models.Note).filter(models.Note.user_id == user.id)
    if subject is not None:
        query = query.filter(models.Note.subject == subject)
    return query.order_by(models.Note.pinned.desc(), models.Note.updated_at.desc(), models.Note.id.desc()).all()


@router.post("", response_model=schemas.NoteOut, status_code=status.HTTP_201_CREATED)
def create_note(
    data: schemas.NoteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    note = models.Note(**data.model_dump(), user_id=user.id)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/{note_id}", response_model=schemas.NoteOut)
def update_note(
    note_id: int,
    data: schemas.NoteUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    note = _get_own_note(note_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    for key in ("title", "content", "color", "pinned"):
        if key in updates and updates[key] is None:
            raise HTTPException(status_code=422, detail=f"{key} cannot be null")
    for field, value in updates.items():
        setattr(note, field, value)
    if not note.title.strip() and not note.content.strip():
        raise HTTPException(status_code=422, detail="Write a title or some text")
    db.commit()
    db.refresh(note)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    note = _get_own_note(note_id, user, db)
    db.delete(note)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)