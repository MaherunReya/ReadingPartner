import json
import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
import usage
from billing_config import PLANS
from database import SessionLocal, get_db
from dependencies import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


def _payments_enabled() -> bool:
    return bool(os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_PRICE_ID"))


def _dev_mode() -> bool:
    return os.getenv("BILLING_DEV_MODE") == "1"


def _frontend_url() -> str:
    explicit = os.getenv("FRONTEND_URL")
    if explicit:
        return explicit.rstrip("/")
    first_origin = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")[0].strip()
    return first_origin.rstrip("/")


def _stripe() -> None:
    if not _payments_enabled():
        raise HTTPException(501, "Payments aren't connected yet, so Pro can't be bought right now.")
    stripe.api_key = os.environ["STRIPE_SECRET_KEY"]


@router.get("/me")
def my_billing(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Everything the billing page needs: current plan, usage so far, and the plans on offer."""
    plan = usage.plan_for(db, user)
    sub = usage.get_subscription(db, user)
    return {
        "plan": plan,
        "period_end": usage.aware(sub.current_period_end).isoformat() if sub and plan["id"] == "pro" and sub.current_period_end else None,
        "can_manage": bool(sub and sub.provider == "stripe" and sub.provider_ref),
        "usage": usage.summary(db, user, plan),
        "plans": [PLANS["free"], PLANS["pro"]],
        "payments_enabled": _payments_enabled(),
        "dev_mode": _dev_mode(),
    }


def _customer_id(db: Session, user: models.User) -> str:
    """Reuse the user's Stripe customer, or create one the first time they open checkout."""
    sub = usage.get_subscription(db, user)
    if sub and sub.provider == "stripe" and sub.provider_ref:
        return sub.provider_ref
    customer = stripe.Customer.create(email=user.email, name=user.name or None, metadata={"user_id": str(user.id)})
    if not sub:
        sub = models.Subscription(user_id=user.id, plan="free", status="active")
        db.add(sub)
    sub.provider, sub.provider_ref = "stripe", customer["id"]
    db.commit()
    return customer["id"]


class CheckoutIn(BaseModel):
    plan: str = "pro"


@router.post("/checkout")
def checkout(data: CheckoutIn, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Create a Stripe Checkout session and hand the browser its URL."""
    if data.plan != "pro":
        raise HTTPException(422, "Only the Pro plan can be bought")
    _stripe()
    if usage.plan_id_for(db, user) == "pro":
        raise HTTPException(409, "You're already on Pro. Use Manage billing to change or cancel it.")
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer=_customer_id(db, user),
            client_reference_id=str(user.id),
            line_items=[{"price": os.environ["STRIPE_PRICE_ID"], "quantity": 1}],
            success_url=f"{_frontend_url()}/billing?checkout=success",
            cancel_url=f"{_frontend_url()}/billing?checkout=cancelled",
        )
    except stripe.StripeError as e:
        print("STRIPE ERROR:", e)
        raise HTTPException(502, "Couldn't start the payment. Try again in a minute.") from e
    return {"url": session["url"]}


@router.post("/portal")
def portal(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Stripe's hosted page where the customer updates their card, sees invoices or cancels."""
    _stripe()
    sub = usage.get_subscription(db, user)
    if not (sub and sub.provider == "stripe" and sub.provider_ref):
        raise HTTPException(404, "There's no billing to manage yet.")
    try:
        session = stripe.billing_portal.Session.create(customer=sub.provider_ref, return_url=f"{_frontend_url()}/billing")
    except stripe.StripeError as e:
        print("STRIPE ERROR:", e)
        raise HTTPException(502, "Couldn't open the billing page. Try again in a minute.") from e
    return {"url": session["url"]}


@router.post("/webhook")
async def webhook(request: Request):
    """Stripe calls this when money moves. It's the ONLY place that grants or removes Pro."""
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise HTTPException(501, "Webhook secret isn't configured.")
    payload = await request.body()
    try:
        # Verifies the signature, so nobody can fake a payment by POSTing here.
        stripe.Webhook.construct_event(payload, request.headers.get("stripe-signature", ""), secret)
    except (ValueError, stripe.SignatureVerificationError):
        raise HTTPException(400, "Invalid signature")

    event = json.loads(payload)  # plain dicts from here on, so SDK version changes can't break parsing
    obj = event["data"]["object"]
    customer_id = obj.get("customer")

    db = SessionLocal()
    try:
        sub = usage.subscription_for_customer(db, customer_id) if customer_id else None
        if sub is None:
            return {"received": True}  # not one of our customers (or a test event), nothing to do

        if event["type"] == "invoice.paid":
            # Each paid invoice covers a billing period; Pro lasts until that period ends. Idempotent.
            ends = [ln["period"]["end"] for ln in obj.get("lines", {}).get("data", []) if ln.get("period")]
            if ends:
                until = datetime.fromtimestamp(max(ends), tz=timezone.utc)
                usage.set_pro_until(db, sub.user_id, until, provider="stripe", ref=customer_id)
        elif event["type"] == "customer.subscription.deleted":
            usage.deactivate(db, sub.user_id)
    finally:
        db.close()
    return {"received": True}


# ---- local testing only: set BILLING_DEV_MODE=1 in backend/.env. Never enable this in production. ----
def _dev_only():
    if not _dev_mode():
        raise HTTPException(404, "Not found")


@router.post("/dev/activate-pro")
def dev_activate_pro(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    _dev_only()
    usage.activate_pro(db, user.id, provider="dev")
    return {"ok": True}


@router.post("/dev/reset")
def dev_reset(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    _dev_only()
    usage.deactivate(db, user.id)
    return {"ok": True}
