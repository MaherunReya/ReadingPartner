from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
from billing_config import PLANS

# Bangladesh has no daylight saving, so a fixed +6 offset is enough (and works on Windows without tzdata).
DHAKA = timezone(timedelta(hours=6))

# kind -> (limit key in the plan, reset period)
KINDS = {
    "flashcards": ("flashcards_per_month", "month"),
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    """Postgres hands back timezone-aware datetimes, SQLite doesn't. Treat naive ones as UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt is not None and dt.tzinfo is None else dt


def period_start(period: str, now: datetime | None = None) -> datetime:
    local = (now or now_utc()).astimezone(DHAKA)
    local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    if period == "month":
        local = local.replace(day=1)
    return local.astimezone(timezone.utc)


def period_end(period: str, now: datetime | None = None) -> datetime:
    start = period_start(period, now).astimezone(DHAKA)
    end = start + timedelta(days=1) if period == "day" else (start + timedelta(days=32)).replace(day=1)
    return end.astimezone(timezone.utc)


def get_subscription(db: Session, user: models.User) -> models.Subscription | None:
    return db.query(models.Subscription).filter(models.Subscription.user_id == user.id).first()


def plan_id_for(db: Session, user: models.User) -> str:
    sub = get_subscription(db, user)
    if sub and sub.plan == "pro" and sub.status == "active" and sub.current_period_end and aware(sub.current_period_end) > now_utc():
        return "pro"
    return "free"


def plan_for(db: Session, user: models.User) -> dict:
    return PLANS[plan_id_for(db, user)]


def used(db: Session, user: models.User, kind: str) -> int:
    _, period = KINDS[kind]
    return (
        db.query(func.count(models.AiUsage.id))
        .filter(
            models.AiUsage.user_id == user.id,
            models.AiUsage.kind == kind,
            models.AiUsage.created_at >= period_start(period),
        )
        .scalar()
        or 0
    )


def summary(db: Session, user: models.User, plan: dict) -> dict:
    out = {}
    for kind, (limit_key, period) in KINDS.items():
        out[kind] = {
            "used": used(db, user, kind),
            "limit": plan[limit_key],
            "period": period,
            "resets_at": period_end(period).isoformat(),
        }
    return out


def check(db: Session, user: models.User, plan: dict, kind: str) -> None:
    """Raise 429 when the user has used up this kind of AI request for the current period."""
    limit_key, period = KINDS[kind]
    if used(db, user, kind) < plan[limit_key]:
        return
    what = "AI generations (flashcard sets and tests)"
    when = "this month"
    reset = "They reset on the 1st."
    tail = " Upgrade to Pro for more." if plan["id"] == "free" else ""
    raise HTTPException(
        429,
        detail={
            "code": "limit_reached",
            "kind": kind,
            "upgrade": plan["id"] == "free",
            "message": f"You've used all {plan[limit_key]} of your {what} {when}. {reset}{tail}",
        },
    )


def record(db: Session, user: models.User, kind: str) -> models.AiUsage:
    row = models.AiUsage(user_id=user.id, kind=kind)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def refund(db: Session, row: models.AiUsage) -> None:
    """Give the use back when the AI call failed, so errors never cost the student a message."""
    db.delete(row)
    db.commit()


def activate_pro(db: Session, user_id: int, days: int = 30, provider: str | None = None, ref: str | None = None):
    """Grant Pro for `days` from now. Only used by the local dev button; Stripe uses set_pro_until."""
    return set_pro_until(db, user_id, now_utc() + timedelta(days=days), provider=provider, ref=ref)


def set_pro_until(db: Session, user_id: int, until: datetime, provider: str | None = None, ref: str | None = None):
    """Make the user Pro until `until`. Safe to call twice with the same value (Stripe may resend webhooks)."""
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()
    if not sub:
        sub = models.Subscription(user_id=user_id)
        db.add(sub)
    sub.plan, sub.status = "pro", "active"
    sub.current_period_end = until
    if provider:
        sub.provider = provider
    if ref:
        sub.provider_ref = ref
    db.commit()
    db.refresh(sub)
    return sub


def subscription_for_customer(db: Session, customer_id: str) -> models.Subscription | None:
    return (
        db.query(models.Subscription)
        .filter(models.Subscription.provider == "stripe", models.Subscription.provider_ref == customer_id)
        .first()
    )


def deactivate(db: Session, user_id: int) -> None:
    sub = db.query(models.Subscription).filter(models.Subscription.user_id == user_id).first()
    if sub:
        sub.plan, sub.status, sub.current_period_end = "free", "active", None
        db.commit()
