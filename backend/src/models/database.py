from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, DateTime, JSON, Text
from datetime import datetime
import os
import uuid

DB_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./research.db")

engine = create_async_engine(DB_URL)
async_session = async_sessionmaker(engine, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

class TaskRecord(Base):
    __tablename__ = "tasks"
    
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    url: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    document: Mapped[dict] = mapped_column(JSON, nullable=True)
    progress: Mapped[dict] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)

def _add_missing_columns(conn):
    # create_all() never alters existing tables, so add columns introduced later
    existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(tasks)")}
    if "progress" not in existing:
        conn.exec_driver_sql("ALTER TABLE tasks ADD COLUMN progress JSON")

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)
