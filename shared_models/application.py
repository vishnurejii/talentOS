from beanie import Document, Link
from pydantic import Field
from typing import Optional
from datetime import datetime
from enum import Enum
from .user import CustomUser, get_utc_now
from .job import Job

class ApplicationStatusEnum(str, Enum):
    APPLIED = "APPLIED"
    ATS_PROCESSING = "ATS_PROCESSING"
    EXAM_PENDING = "EXAM_PENDING"
    EXAM_DONE = "EXAM_DONE"
    SHORTLISTED = "SHORTLISTED"
    REJECTED = "REJECTED"

class Application(Document):
    job: Link[Job]
    candidate: Link[CustomUser]
    cv_url: str
    ats_score: Optional[float] = None
    exam_score: Optional[float] = None
    final_score: Optional[float] = None
    rank: Optional[int] = None
    status: ApplicationStatusEnum = ApplicationStatusEnum.APPLIED
    applied_at: datetime = Field(default_factory=get_utc_now)

    class Settings:
        name = "applications"
