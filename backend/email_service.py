import logging
import os
import smtplib
from email.message import EmailMessage

from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("uvicorn.error")


def send_email(to: str, subject: str, text: str, html: str) -> None:
    """Send via SMTP. If SMTP_HOST is not set, print the email to the console (dev mode)."""
    host = os.getenv("SMTP_HOST")
    if not host:
        print(f"\n--- EMAIL (SMTP not configured, printing instead) ---\nTo: {to}\nSubject: {subject}\n\n{text}\n---\n")
        return

    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")
    sender = os.getenv("SMTP_FROM") or user

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    try:
        if port == 465:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.starttls()
        with server:
            if user and password:
                server.login(user, password)
            server.send_message(msg)
    except Exception:
        # Runs in a background task: log it, never crash the request.
        logger.exception("Failed to send email to %s", to)


def send_verification_email(to: str, code: str) -> None:
    minutes = os.getenv("OTP_EXPIRE_MINUTES", "10")
    text = (
        "Welcome to Reading Partner.\n\n"
        f"Your verification code is: {code}\n\n"
        f"It expires in {minutes} minutes. If you didn't create an account, ignore this email."
    )
    html = (
        "<p>Welcome to Reading Partner.</p>"
        f'<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">{code}</p>'
        f"<p>It expires in {minutes} minutes. If you didn't create an account, ignore this email.</p>"
    )
    send_email(to, f"{code} is your Reading Partner verification code", text, html)