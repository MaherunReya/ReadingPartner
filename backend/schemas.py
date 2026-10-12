import datetime as dt
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# ---------- Auth ----------
class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name is required")
        return v

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, v: str) -> str:
        # bcrypt only uses the first 72 bytes
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes")
        return v


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: Optional[str] = None
    email: EmailStr
    is_verified: bool = False
    created_at: Optional[datetime] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EmailRequest(BaseModel):
    email: EmailStr


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=1, max_length=10)


class MessageOut(BaseModel):
    message: str


# ---------- Tasks ----------
class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(default=None, max_length=100)
    deadline: Optional[datetime] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(default=None, max_length=100)
    deadline: Optional[datetime] = None
    completed: Optional[bool] = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    subject: Optional[str] = None
    deadline: Optional[datetime] = None
    completed: bool
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Prayers ----------
PrayerName = Literal["fajr", "dhuhr", "asr", "maghrib", "isha"]


class PrayerToggle(BaseModel):
    completed: bool


class PrayerLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: dt.date
    prayer: PrayerName


class PrayerState(BaseModel):
    date: dt.date
    prayer: PrayerName
    completed: bool


# ---------- Focus sessions ----------
class FocusSessionCreate(BaseModel):
    minutes: int = Field(ge=1, le=180)
    subject: Optional[str] = Field(default=None, max_length=100)


class FocusSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    minutes: int
    subject: Optional[str] = None
    completed_at: datetime