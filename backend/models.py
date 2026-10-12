from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
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