import datetime as dt
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


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


# ---------- Focus timer ----------
class FocusCreate(BaseModel):
    minutes: int = Field(ge=1, le=240)
    task_id: Optional[int] = None


class FocusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    minutes: int
    task_id: Optional[int] = None
    completed_at: datetime


# ---------- Notes ----------
NoteColor = Literal["sun", "pink", "sky", "mint"]


class NoteCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    content: str = Field(default="", max_length=20000)
    subject: Optional[str] = Field(default=None, max_length=100)
    color: NoteColor = "sun"
    pinned: bool = False

    @model_validator(mode="after")
    def not_blank(self):
        if not self.title.strip() and not self.content.strip():
            raise ValueError("Write a title or some text")
        return self


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    content: Optional[str] = Field(default=None, max_length=20000)
    subject: Optional[str] = Field(default=None, max_length=100)
    color: Optional[NoteColor] = None
    pinned: Optional[bool] = None


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    subject: Optional[str] = None
    color: NoteColor
    pinned: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ---------- Mood check-ins ----------
MoodTag = Literal["energized", "calm", "focused", "motivated", "tired", "stressed", "distracted", "overwhelmed"]


class MoodSet(BaseModel):
    mood: int = Field(ge=1, le=5)
    tags: list[MoodTag] = Field(default_factory=list, max_length=8)
    note: Optional[str] = Field(default=None, max_length=500)


class MoodOut(BaseModel):
    date: dt.date
    mood: int
    tags: list[MoodTag]
    note: Optional[str] = None


# ---------- Flashcards ----------
DeckColor = Literal["sun", "pink", "sky", "mint"]


def _not_blank(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("This can't be empty")
    return v


class DeckCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    subject: Optional[str] = Field(default=None, max_length=100)
    color: DeckColor = "sun"

    _name = field_validator("name")(_not_blank)


class DeckUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    subject: Optional[str] = Field(default=None, max_length=100)
    color: Optional[DeckColor] = None


class DeckOut(BaseModel):
    id: int
    name: str
    subject: Optional[str] = None
    color: DeckColor
    card_count: int
    due_count: int
    mastered_count: int
    created_at: Optional[datetime] = None


class CardCreate(BaseModel):
    front: str = Field(min_length=1, max_length=2000)
    back: str = Field(min_length=1, max_length=2000)

    _front = field_validator("front")(_not_blank)
    _back = field_validator("back")(_not_blank)


class CardUpdate(BaseModel):
    front: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    back: Optional[str] = Field(default=None, min_length=1, max_length=2000)


class CardBulk(BaseModel):
    cards: list[CardCreate] = Field(min_length=1, max_length=200)


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    deck_id: int
    front: str
    back: str
    box: int
    due_at: datetime
    reviews: int


class ReviewIn(BaseModel):
    correct: bool