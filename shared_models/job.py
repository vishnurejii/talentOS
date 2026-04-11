from beanie import Document, Link
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from .user import CustomUser, get_utc_now

class JobTypeEnum(str, Enum):
    IT = "IT"
    NON_IT = "NON_IT"

class JobStatusEnum(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"

class Job(Document):
    title: str
    description: str
    skills_required: List[str]
    job_type: JobTypeEnum
    exam_duration_mins: int = 60
    ats_weight: float = 0.4
    exam_weight: float = 0.6
    status: JobStatusEnum = JobStatusEnum.OPEN
    created_by: Link[CustomUser]
    created_at: datetime = Field(default_factory=get_utc_now)

    class Settings:
        name = "jobs"
