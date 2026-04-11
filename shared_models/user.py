from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime, timezone
from typing import Optional
from enum import Enum
import hashlib

class RoleEnum(str, Enum):
    HR = "HR"
    CANDIDATE = "CANDIDATE"
    ADMIN = "ADMIN"

def get_utc_now():
    return datetime.now(timezone.utc)

def hash_password(password: str) -> str:
    # A simple SHA256 hash for demonstration (ideally use bcrypt/passlib)
    return hashlib.sha256(password.encode()).hexdigest()

class CustomUser(Document):
    email: EmailStr = Field(unique=True)
    full_name: str
    password: str  # Hashed password
    role: RoleEnum
    created_at: datetime = Field(default_factory=get_utc_now)
    
    @property
    def is_authenticated(self):
        return True

    @property
    def is_active(self):
        return True

    def check_password(self, raw_password: str) -> bool:
        return self.password == hash_password(raw_password)

    class Settings:
        name = "users"
