import os
import smtplib
from email.message import EmailMessage
from typing import Iterable, List


def _smtp_host() -> str:
    return os.getenv("SMTP_HOST", "127.0.0.1").strip()


def _smtp_port() -> int:
    raw = os.getenv("SMTP_PORT", "1025").strip()
    try:
        return int(raw)
    except ValueError:
        return 1025


def _smtp_from() -> str:
    return os.getenv("SMTP_FROM_EMAIL", "noreply@endless.local").strip()


def _smtp_use_tls() -> bool:
    return os.getenv("SMTP_USE_TLS", "false").strip().lower() in {"1", "true", "yes", "on"}


def _smtp_username() -> str:
    return os.getenv("SMTP_USERNAME", "").strip()


def _smtp_password() -> str:
    return os.getenv("SMTP_PASSWORD", "").strip()


def _normalize_recipients(recipients: Iterable[str]) -> List[str]:
    return [r.strip() for r in recipients if r and r.strip()]


def send_email(subject: str, recipients: Iterable[str], text_body: str, html_body: str | None = None) -> None:
    """
    Send an email using SMTP settings from environment.
    Defaults target MailHog on localhost for zero-config local testing.
    """
    to_list = _normalize_recipients(recipients)
    if not to_list:
        raise ValueError("No recipients provided")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = _smtp_from()
    msg["To"] = ", ".join(to_list)
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")

    host = _smtp_host()
    port = _smtp_port()
    with smtplib.SMTP(host, port, timeout=10) as smtp:
        if _smtp_use_tls():
            smtp.starttls()

        username = _smtp_username()
        password = _smtp_password()
        if username and password:
            smtp.login(username, password)

        smtp.send_message(msg)
