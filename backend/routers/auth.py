import hmac
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user
from email_service import send_verification_email
from security import (
    OTP_EXPIRE_MINUTES,
    OTP_MAX_ATTEMPTS,
    create_access_token,
    generate_otp,
    hash_otp,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

RESEND_COOLDOWN_SECONDS = 60
_last_resend: dict[str, float] = {}  # in-memory; resets on server restart


def _resend_allowed(email: str) -> bool:
    now = time.time()
    if now - _last_resend.get(email, 0) < RESEND_COOLDOWN_SECONDS:
        return False
    _last_resend[email] = now
    return True


def _issue_code(user: models.User, db: Session, background: BackgroundTasks) -> None:
    """Create a fresh 6-digit code, store only its hash, and email it."""
    code = generate_otp()
    user.verification_code_hash = hash_otp(user.email, code)
    user.verification_code_expires_at = datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRE_MINUTES)
    user.verification_attempts = 0
    db.commit()
    background.add_task(send_verification_email, user.email, code)


@router.post("/signup", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def signup(data: schemas.UserCreate, background: BackgroundTasks, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = models.User(name=data.name, email=email, hashed_password=hash_password(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    _issue_code(user, db, background)
    db.refresh(user)
    return user


@router.post("/verify-email", response_model=schemas.MessageOut)
def verify_email(data: schemas.VerifyRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()
    if user is None or user.is_verified or not user.verification_code_hash:
        raise HTTPException(status_code=400, detail="Incorrect or expired code.")

    expires = user.verification_code_expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires is None or expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="That code has expired. Request a new one.")

    if user.verification_attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts. Request a new code.")

    if not hmac.compare_digest(user.verification_code_hash, hash_otp(user.email, data.code.strip())):
        user.verification_attempts += 1
        db.commit()
        raise HTTPException(status_code=400, detail="Incorrect code. Check the email and try again.")

    user.is_verified = True
    user.verification_code_hash = None
    user.verification_code_expires_at = None
    user.verification_attempts = 0
    db.commit()
    return {"message": "Email verified."}


@router.post("/resend-verification", response_model=schemas.MessageOut)
def resend_verification(
    data: schemas.EmailRequest, background: BackgroundTasks, db: Session = Depends(get_db)
):
    email = data.email.lower()
    user = db.query(models.User).filter(models.User.email == email).first()
    if user and not user.is_verified and _resend_allowed(email):
        _issue_code(user, db, background)
    # Same answer in every case so this can't be used to find out who has an account.
    return {"message": "If that account exists and isn't verified yet, a new code is on its way."}


@router.post("/login", response_model=schemas.Token)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # OAuth2 form uses the field name "username"; we treat it as the email
    user = db.query(models.User).filter(models.User.email == form.username.lower()).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "email_not_verified",
                "message": "Verify your email before logging in.",
            },
        )

    return schemas.Token(access_token=create_access_token(user.id))


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user