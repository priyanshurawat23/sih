from sqlalchemy import Boolean, Column, Integer, String, DateTime, Text, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    reports = relationship("Report", back_populates="owner", cascade="all, delete-orphan")

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    owner = relationship("User", back_populates="reports")

    raw_text = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    test_values = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), index=True)
    has_abnormal = Column(Boolean, default=False)
