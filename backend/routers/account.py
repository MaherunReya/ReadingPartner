import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, get_db
from dependencies import get_current_user
from security import hash_password, verify_password

router = APIRouter(prefix="/account", tags=["account"])

# A wrong password here is a 400, never a 401: the frontend logs people out on 401.


def _check_password(user: models.User, password: str) -> None:
    if not verify_password(password, user.hashed_password):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Incorrect password")


@router.patch("/profile", response_model=schemas.UserOut)
def update_profile(data: schemas.ProfileUpdate, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    user.name = data.name
    db.commit()
    db.refresh(user)
    return user


@router.post("/password", response_model=schemas.MessageOut)
def change_password(data: schemas.PasswordChange, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    _check_password(user, data.current_password)
    user.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"message": "Password changed."}


@router.post("/deactivate", response_model=schemas.MessageOut)
def deactivate(data: schemas.PasswordConfirm, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Lock the account but keep everything. Logging in again brings it back.

    This does not touch billing: a Pro subscription keeps renewing until it is cancelled."""
    _check_password(user, data.password)
    user.is_active = False
    db.commit()
    return {"message": "Account deactivated. Log in any time to reactivate it."}


def _close_stripe_customer(db: Session, user: models.User) -> None:
    """Deleting a Stripe customer also cancels its subscription, so nobody keeps paying for a deleted account."""
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user.id).first()
    if not (sub and sub.provider == "stripe" and sub.provider_ref):
        return
    key = os.getenv("STRIPE_SECRET_KEY")
    if not key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Billing isn't available right now, so your Pro subscription can't be cancelled. Nothing was deleted. Try again later.",
        )
    stripe.api_key = key
    try:
        stripe.Customer.delete(sub.provider_ref)
    except stripe.StripeError as e:
        if getattr(e, "code", None) == "resource_missing":
            return  # already gone on Stripe's side
        print("STRIPE ERROR:", e)
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            "Couldn't cancel your Pro subscription, so nothing was deleted. Try again, or cancel it on the Billing page first.",
        )


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(data: schemas.DeleteAccount, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Permanently remove the account and everything that belongs to it."""
    _check_password(user, data.password)
    _close_stripe_customer(db, user)
    user_id = user.id
    try:
        # Every table with a user_id column, children before parents, then the user. This covers tables added later too.
        for table in reversed(Base.metadata.sorted_tables):
            if "user_id" in table.c:
                db.execute(table.delete().where(table.c.user_id == user_id))
        db.execute(models.User.__table__.delete().where(models.User.id == user_id))
        db.commit()
    except Exception:
        db.rollback()
        raise
    return Response(status_code=status.HTTP_204_NO_CONTENT)