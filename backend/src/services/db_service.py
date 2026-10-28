from sqlalchemy.future import select
from src.models.database import async_session, TaskRecord
from src.models.schemas import ResearchTask, TaskStatus
from uuid import UUID
from datetime import datetime

async def create_task(task_id: UUID, url: str) -> TaskRecord:
    async with async_session() as session:
        task = TaskRecord(
            id=str(task_id),
            url=url,
            status=TaskStatus.PENDING.value
        )
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return task

async def update_task_status(task_id: UUID, status: TaskStatus, document: dict = None, error_message: str = None):
    async with async_session() as session:
        result = await session.execute(select(TaskRecord).where(TaskRecord.id == str(task_id)))
        task = result.scalar_one_or_none()
        if task:
            task.status = status.value
            if document:
                task.document = document
            if error_message:
                task.error_message = error_message
            task.updated_at = datetime.now()
            await session.commit()

async def update_task_progress(task_id: UUID, progress: dict):
    async with async_session() as session:
        result = await session.execute(select(TaskRecord).where(TaskRecord.id == str(task_id)))
        task = result.scalar_one_or_none()
        if task:
            # Assign a fresh copy so SQLAlchemy sees the JSON column as changed
            task.progress = dict(progress)
            task.updated_at = datetime.now()
            await session.commit()

async def get_task(task_id: UUID) -> TaskRecord:
    async with async_session() as session:
        result = await session.execute(select(TaskRecord).where(TaskRecord.id == str(task_id)))
        return result.scalar_one_or_none()

async def get_all_tasks():
    async with async_session() as session:
        result = await session.execute(select(TaskRecord).order_by(TaskRecord.created_at.desc()))
        return result.scalars().all()

FINISHED = (TaskStatus.COMPLETED.value, TaskStatus.FAILED.value)

async def fail_interrupted_tasks() -> int:
    """Runs execute inside the server process, so any run unfinished at startup was cut off by a restart."""
    async with async_session() as session:
        result = await session.execute(select(TaskRecord).where(TaskRecord.status.not_in(FINISHED)))
        tasks = result.scalars().all()
        for task in tasks:
            task.status = TaskStatus.FAILED.value
            task.error_message = "Interrupted because the server restarted - please run it again"
            task.updated_at = datetime.now()
        await session.commit()
        return len(tasks)
