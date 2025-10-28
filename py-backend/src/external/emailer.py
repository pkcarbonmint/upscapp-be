from jinja2 import Environment, PackageLoader, select_autoescape
from fastapi.templating import Jinja2Templates
from pydantic import EmailStr, BaseModel
from typing import List, Optional, Dict, Any
from fastapi import BackgroundTasks
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from src.config import settings

env = Environment(
    loader=PackageLoader("src", "templates"),
    autoescape=select_autoescape(["html", "xml"]),
)

templates = Jinja2Templates(directory="templates")
templates.env = env

# Define the config
conf = ConnectionConfig(
    MAIL_USERNAME=settings.EMAIL_USER,
    MAIL_PASSWORD=settings.EMAIL_PASSWORD,
    MAIL_FROM=settings.EMAIL_FROM,
    MAIL_PORT=settings.EMAIL_PORT,
    MAIL_SERVER=settings.EMAIL_HOST,
    MAIL_FROM_NAME=settings.EMAIL_FROM_NAME,
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


class Email:
    def __init__(self):
        pass

    async def send_email(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        subject: str,
        data: Optional[Dict[str, Any]],
        template_name: str,
    ):
        # Generate the HTML template base on the template name
        template = templates.get_template(f"{template_name}.html")

        html = template.render(
            data=data, subject=subject, recipient_name=recipient_name
        )

        # Define the message options
        message = MessageSchema(
            subject=subject, recipients=email_to, body=html, subtype="html"
        )

        # Send the email
        fm = FastMail(conf)
        await fm.send_message(message)

    async def send_emails(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        subject: str,
        data: Optional[Dict[str, Any]],
        template_name: str,
    ):
        # Generate the HTML template base on the template name
        template = templates.get_template(f"{template_name}.html")

        html = template.render(
            data=data, subject=subject, recipient_name=recipient_name
        )
        if settings.EMAIL_FROM in email_to:
            email_to.remove(settings.EMAIL_FROM)

        # Define the message options
        message = MessageSchema(
           recipients=[settings.EMAIL_FROM], subject=subject, bcc= email_to, body=html, subtype="html"
        )

        # Send the email
        fm = FastMail(conf)
        await fm.send_message(message)

    async def send_verification_code(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        data: Optional[Dict[str, Any]],
    ):
        await self.send_email(
            recipient_name=recipient_name,
            email_to=email_to,
            subject="Your verification code (Valid for 10min)",
            data=data,
            template_name="email_verification",
        )

    async def send_otp(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        data: Optional[Dict[str, Any]],
    ):
        await self.send_email(
            recipient_name=recipient_name,
            email_to=email_to,
            subject="Your OTP code (Valid for 10min)",
            data=data,
            template_name="email_otp",
        )

    async def send_password(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        data: Optional[Dict[str, Any]],
    ):
        await self.send_email(
            recipient_name=recipient_name,
            email_to=email_to,
            subject="Your user credentials for UPSC.PRO ",
            data=data,
            template_name="email_password",
        )

    async def send_email_notification(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        data: Optional[Dict[str, Any]],
    ):
        subject_str = data.get("title") or "UPSC.PRO"

        await self.send_email(
            recipient_name=recipient_name,
            email_to=email_to,
            subject=subject_str,
            data=data,
            template_name="email_notification",
        )

    async def send_email_notifications(
        self,
        recipient_name: str,
        email_to: List[EmailStr],
        data: Optional[Dict[str, Any]],
    ):
        subject_str = data.get("title") or "UPSC.PRO"

        email_lists = [email_to[i:i + 49] for i in range(0, len(email_to), 49)]

        for email_list in email_lists:
            await self.send_emails(
                recipient_name=recipient_name,
                email_to=email_list,
                subject=subject_str,
                data=data,
                template_name="email_test_notification",
            )    


email = Email()

# def send_email_background(background_tasks: BackgroundTasks, subject: str, email_to: str, body: dict):
#     message = MessageSchema(
#         subject=subject,
#         recipients=[email_to],
#         body=body,
#         subtype='html',
#     )

#     fm = FastMail(conf)

#     background_tasks.add_task(
#         fm.send_message, message, template_name='email.html')
