import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional

from app.core.config import settings

async def send_email(
    recipient_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None
) -> bool:
    """
    Send an email using configured SMTP settings
    Returns True if email was sent successfully, False otherwise
    """
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = settings.FROM_EMAIL
        msg['To'] = recipient_email

        # Add plain text version if provided
        if text_content:
            msg.attach(MIMEText(text_content, 'plain'))
        
        # Add HTML version
        msg.attach(MIMEText(html_content, 'html'))

        # Create SMTP connection
        with smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)

        return True
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False

async def send_welcome_email(email: str, name: str, temp_password: str) -> bool:
    """
    Send welcome email to new teacher with temporary password
    """
    subject = "Welcome to MeriTY Credit Tracker"
    
    html_content = f"""
    <html>
    <body>
        <h2>Welcome to MeriTY Credit Tracker</h2>
        <p>Dear {name},</p>
        <p>Welcome to the MeriTY Credit Tracker system. Your account has been created with the following credentials:</p>
        <p>
            <strong>Email:</strong> {email}<br>
            <strong>Temporary Password:</strong> {temp_password}
        </p>
        <p>Please log in and change your password immediately for security purposes.</p>
        <p>Best regards,<br>MeriTY Credit Tracker Team</p>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to MeriTY Credit Tracker

    Dear {name},

    Welcome to the MeriTY Credit Tracker system. Your account has been created with the following credentials:

    Email: {email}
    Temporary Password: {temp_password}

    Please log in and change your password immediately for security purposes.

    Best regards,
    MeriTY Credit Tracker Team
    """

    return await send_email(email, subject, html_content, text_content)

async def send_password_reset_email(email: str, name: str, reset_token: str) -> bool:
    """
    Send password reset email with reset link
    """
    # In production, this would be your actual frontend URL
    frontend_url = "http://localhost:8080"
    reset_link = f"{frontend_url}/pages/reset-password.html?token={reset_token}"
    
    subject = "Password Reset Request"
    
    html_content = f"""
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Dear {name},</p>
        <p>We received a request to reset your password for the TY Credits Tracker system.</p>
        <p>Click the link below to reset your password:</p>
        <p><a href="{reset_link}">Reset Password</a></p>
        <p>This link will expire in 30 minutes.</p>
        <p>If you didn't request this reset, please ignore this email.</p>
        <p>Best regards,<br>TY Credits Tracker Team</p>
    </body>
    </html>
    """
    
    text_content = f"""
    Password Reset Request

    Dear {name},

    We received a request to reset your password for the MeriTY Credit Tracker system.

    Click the link below to reset your password:
    {reset_link}

    This link will expire in 30 minutes.

    If you didn't request this reset, please ignore this email.

    Best regards,
    MeriTY Credit Tracker Team
    """

    return await send_email(email, subject, html_content, text_content)