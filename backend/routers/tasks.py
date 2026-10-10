from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _get_own_task(task_id: int, user: models.User, db: Session) -> models.Task:
    task = (
        db.query(models.Task)
        .filter(models.Task.id == task_id, models.Task.user_id == user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


@router.post("", response_model=schemas.TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    data: schemas.TaskCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = models.Task(**data.model_dump(), user_id=user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("", response_model=list[schemas.TaskOut])
def list_tasks(
    subject: Optional[str] = None,
    completed: Optional[bool] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = db.query(models.Task).filter(models.Task.user_id == user.id)
    if subject is not None:
        query = query.filter(models.Task.subject == subject)
    if completed is not None:
        query = query.filter(models.Task.completed == completed)
    # soonest deadline first; tasks without a deadline last
    return query.order_by(
        models.Task.deadline.is_(None), models.Task.deadline.asc(), models.Task.id.desc()
    ).all()


@router.get("/{task_id}", response_model=schemas.TaskOut)
def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return _get_own_task(task_id, user, db)


@router.patch("/{task_id}", response_model=schemas.TaskOut)
def update_task(
    task_id: int,
    data: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _get_own_task(task_id, user, db)
    updates = data.model_dump(exclude_unset=True)
    if updates.get("title", "x") is None or updates.get("completed", True) is None:
        raise HTTPException(status_code=422, detail="title and completed cannot be null")
    for field, value in updates.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    task = _get_own_task(task_id, user, db)
    db.delete(task)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)