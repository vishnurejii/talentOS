from beanie import Document, Link
from pydantic import Field
from typing import List, Optional
from datetime import datetime
from enum import Enum
from .user import CustomUser, get_utc_now
from .job import Job

class QuestionTypeEnum(str, Enum):
    MCQ = "MCQ"
    CODING = "CODING"

class ExamStatusEnum(str, Enum):
    GENERATED = "GENERATED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"

class Question(Document):
    """A single exam question — MCQ or coding."""
    job: Link[Job]
    question_text: str
    question_type: QuestionTypeEnum
    # MCQ fields
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    # Coding fields
    starter_code: Optional[str] = None
    language: Optional[str] = None        # python, javascript, java, etc.
    test_cases: Optional[List[dict]] = None  # [{"input": "...", "expected": "..."}]
    points: int = 10
    created_at: datetime = Field(default_factory=get_utc_now)

    class Settings:
        name = "questions"

class ExamSession(Document):
    """One candidate's exam attempt for a specific job."""
    job: Link[Job]
    candidate: Link[CustomUser]
    questions: List[Link[Question]] = []
    started_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    total_score: Optional[float] = None
    status: ExamStatusEnum = ExamStatusEnum.GENERATED
    answers: List[dict] = []   # [{"question_id": "...", "answer": "...", "score": 0}]
    
    # Proctoring fields
    proctoring_violations: List[dict] = [] # [{"type": "TAB_SWITCH", "timestamp": "..."}]
    warning_count: int = 0

    class Settings:
        name = "exam_sessions"
