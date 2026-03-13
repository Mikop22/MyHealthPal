"""Async email service using aiosmtplib (Gmail SMTP, no API key needed)."""

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)


def _build_appointment_email(
    patient_name: str,
    appointment_date: str,
    appointment_time: str,
    form_url: str,
    mobile_link: str = "",
) -> MIMEMultipart:
    """Build an HTML appointment email."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Diagnostic — Your Appointment on {appointment_date}"
    msg["From"] = settings.SMTP_USER

    mobile_section = ""
    if mobile_link:
        mobile_section = f"""\
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          <strong>Preferred:</strong> Open the link below in the MyHealthPal mobile app to prepare for your visit:
        </p>

        <div style="text-align: center; margin: 24px 0;">
          <a href="{mobile_link}"
             style="display: inline-block; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
            Prepare in MyHealthPal App
          </a>
        </div>

        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Or use the web form as a fallback:
        </p>
"""

    if mobile_link:
        intro_text = ""
        cta_bg = "#e5e7eb"
        cta_color = "#334155"
        cta_label = "Web Form (Fallback)"
    else:
        intro_text = "Please complete your patient intake form before your appointment:"
        cta_bg = "linear-gradient(135deg, #7c3aed, #6d28d9)"
        cta_color = "#fff"
        cta_label = "Complete Patient Form"

    html = f"""\
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8f8fc; padding: 40px 0;">
      <div style="max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
        <h1 style="color: #1e1b4b; font-size: 24px; margin: 0 0 8px;">Diagnostic</h1>
        <p style="color: #64748b; font-size: 14px; margin: 0 0 32px;">Healthcare Advocacy Platform</p>

        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Hi <strong>{patient_name}</strong>,
        </p>
        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          Your appointment has been scheduled for:
        </p>

        <div style="background: #f1f0ff; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
          <p style="color: #6d28d9; font-size: 20px; font-weight: 600; margin: 0;">
            {appointment_date} at {appointment_time}
          </p>
        </div>

        {mobile_section}

        <p style="color: #334155; font-size: 16px; line-height: 1.6;">
          {intro_text}
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="{form_url}"
             style="display: inline-block; background: {cta_bg}; color: {cta_color}; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-size: 16px; font-weight: 600;">
            {cta_label}
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 32px;">
          This is an automated message from Diagnostic. Please do not reply.
        </p>
      </div>
    </body>
    </html>
    """

    mobile_text = ""
    if mobile_link:
        mobile_text = (
            f"Preferred — open in MyHealthPal app: {mobile_link}\n\n"
            f"Or use the web form as a fallback:\n"
        )

    text = (
        f"Hi {patient_name},\n\n"
        f"Your appointment is scheduled for {appointment_date} at {appointment_time}.\n\n"
        f"{mobile_text}"
        f"Please complete your patient form: {form_url}\n\n"
        f"— Diagnostic"
    )

    msg.attach(MIMEText(text, "plain"))
    msg.attach(MIMEText(html, "html"))
    return msg


async def send_appointment_email(
    patient_email: str,
    patient_name: str,
    appointment_date: str,
    appointment_time: str,
    form_url: str,
    mobile_link: str = "",
) -> bool:
    """Send appointment confirmation email with patient form link.

    Returns True on success, False if SMTP is not configured (graceful fallback).
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP not configured — skipping email. "
            "Set SMTP_USER and SMTP_PASSWORD in .env to enable."
        )
        logger.info(
            f"[EMAIL STUB] To: {patient_email} | "
            f"Appointment: {appointment_date} {appointment_time} | "
            f"Form: {form_url}"
            + (f" | Mobile: {mobile_link}" if mobile_link else "")
        )
        return False

    msg = _build_appointment_email(
        patient_name, appointment_date, appointment_time, form_url, mobile_link
    )
    msg["To"] = patient_email

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            recipients=[patient_email],
        )
        logger.info(f"Appointment email sent to {patient_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {patient_email}: {e}")
        return False
