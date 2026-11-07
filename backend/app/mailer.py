"""Send email over SMTP. Works with Gmail (app password), Zoho, Outlook, SES, etc.

Environment:
  SMTP_HOST      e.g. smtp.gmail.com
  SMTP_PORT      587 (STARTTLS, default) or 465 (SSL)
  SMTP_USER      login, usually your email address
  SMTP_PASSWORD  app password / SMTP password
  SMTP_FROM      sender shown to recipients (defaults to SMTP_USER)
  NOTIFY_TO      where enquiries are delivered (comma-separated for several)
  AUTO_REPLY     "true" to send visitors a short confirmation email
"""
import logging
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

log = logging.getLogger("vastverse.mail")


def configured() -> bool:
    return bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD") and os.getenv("NOTIFY_TO"))


def send(to: str | list[str], subject: str, text: str, html: str | None = None, reply_to: str | None = None) -> None:
    """Send synchronously. On serverless platforms work after the response may be
    frozen, so we send before returning. Raises on failure."""
    host, port = os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "587"))
    user, password = os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"]
    sender = os.getenv("SMTP_FROM") or user

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = sender if "<" in sender else formataddr(("Vastverse website", sender))
    msg["To"] = ", ".join(to) if isinstance(to, list) else to
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text)
    if html:
        msg.add_alternative(html, subtype="html")

    ctx = ssl.create_default_context()
    if port == 465:
        with smtplib.SMTP_SSL(host, port, context=ctx, timeout=10) as s:
            s.login(user, password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=10) as s:
            s.starttls(context=ctx)
            s.login(user, password)
            s.send_message(msg)


def notify_to() -> list[str]:
    return [a.strip() for a in os.getenv("NOTIFY_TO", "").split(",") if a.strip()]


def auto_reply_enabled() -> bool:
    return os.getenv("AUTO_REPLY", "").lower() in {"1", "true", "yes"}
