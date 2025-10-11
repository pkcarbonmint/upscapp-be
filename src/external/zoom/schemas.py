
from src.base.schemas import BaseSchema
from datetime import datetime

class ZoomMeetingSettings(BaseSchema):
    join_before_host: bool | None = None
    waiting_room: bool | None = None
    auto_recording: str | None = None #(The automatic recording settings.local - Record the meeting locally.cloud - Record the meeting to the cloud.none - Auto-recording disabled.)

class ZoomMeetingCreate(BaseSchema):
    agenda: str | None = None
    type: int | None = None
    start_time: datetime | None = None
    duration: int | None = None
    timezome: str | None = None #Asia/Calcutta
    default_password: bool | None = None
    password: str | None = None
    settings: ZoomMeetingSettings | None = None
    meeting_authentication:  bool | None = None
    meeting_invitees: list[dict] | None = None 
    #   [{
    #     "email": "jchill@example.com"
    #   }
    # ],
    mute_upon_entry:  bool | None = None
    participant_video: bool | None = None
    private_meeting:  bool | None = None
    registrants_confirmation_email:  bool | None = None
    registrants_email_notification:  bool | None = None