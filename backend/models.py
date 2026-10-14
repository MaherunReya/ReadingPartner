from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import expression, func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False, nullable=False, server_default=expression.false())
    verification_code_hash = Column(String, nullable=True)
    verification_code_expires_at = Column(DateTime(timezone=True), nullable=True)
    verification_attempts = Column(Integer, default=0, nullable=False, server_default="0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    subject = Column(String(100), nullable=True, index=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    completed = Column(Boolean, default=False, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="tasks")


class PrayerLog(Base):
    """One row = one prayer the user marked as prayed on a given day."""

    __tablename__ = "prayer_logs"
    __table_args__ = (UniqueConstraint("user_id", "date", "prayer", name="uq_prayer_log"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    prayer = Column(String(10), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FocusSession(Base):
    """One completed Pomodoro focus session."""

    __tablename__ = "focus_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    minutes = Column(Integer, nullable=False)
    completed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class Note(Base):
    """A sticky note: short free-form text, optionally tied to a subject."""

    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False, default="")
    content = Column(Text, nullable=False, default="")
    subject = Column(String(100), nullable=True)
    color = Column(String(10), nullable=False, default="sun")
    pinned = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MoodEntry(Base):
    """One daily mood check-in per user (1 = rough ... 5 = great), with optional tags and a note."""

    __tablename__ = "mood_entries"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_mood_entry"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    mood = Column(Integer, nullable=False)
    tags = Column(String(200), nullable=False, default="")  # comma-separated, from a fixed list
    note = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Deck(Base):
    """A set of flashcards, e.g. one per lecture."""

    __tablename__ = "decks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    subject = Column(String(100), nullable=True)
    color = Column(String(10), nullable=False, default="sun")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Card(Base):
    """A flashcard. `box` (1-5) and `due_at` implement Leitner-style spaced repetition."""

    __tablename__ = "cards"

    id = Column(Integer, primary_key=True, index=True)
    deck_id = Column(Integer, ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    front = Column(Text, nullable=False)
    back = Column(Text, nullable=False)
    box = Column(Integer, nullable=False, default=1)
    due_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviews = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Subscription(Base):
    """One row per user. Pro is active while status is 'active' and current_period_end is in the future."""

    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    plan = Column(String(20), nullable=False, default="free")
    status = Column(String(20), nullable=False, default="active")
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    provider = Column(String(30), nullable=True)  # "stripe"
    provider_ref = Column(String(120), nullable=True, index=True)  # Stripe customer id (cus_...)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AiUsage(Base):
    """One row per AI request that counted against the user's limits."""

    __tablename__ = "ai_usage"
    __table_args__ = (Index("ix_ai_usage_user_kind_time", "user_id", "kind", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(20), nullable=False)  # currently just "flashcards"
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
