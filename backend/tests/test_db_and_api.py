import pytest
from uuid import uuid4
from datetime import datetime
from src.services.db_service import create_task, update_task_status, get_task, get_all_tasks
from src.models.schemas import TaskStatus

pytestmark = pytest.mark.usefixtures("db")

@pytest.mark.asyncio
async def test_full_task_lifecycle_in_db():
    task_id = uuid4()
    url = "https://test-lifecycle.com"
    
    # 1. Create
    task = await create_task(task_id, url)
    assert task.id == str(task_id)
    assert task.status == TaskStatus.PENDING.value
    
    # 2. Update to Scraping
    await update_task_status(task_id, TaskStatus.SCRAPING)
    updated = await get_task(task_id)
    assert updated.status == TaskStatus.SCRAPING.value
    
    # 3. Update to Completed with Document
    doc = {"summary": "Test", "insights": ["i1"], "content": "c", "validation": "v", "risks": "r", "comparison": "c"}
    await update_task_status(task_id, TaskStatus.COMPLETED, document=doc)
    final = await get_task(task_id)
    assert final.status == TaskStatus.COMPLETED.value
    assert final.document["summary"] == "Test"
    
    # 4. List all
    all_tasks = await get_all_tasks()
    assert len(all_tasks) >= 1
    assert any(t.id == str(task_id) for t in all_tasks)

@pytest.mark.asyncio
async def test_get_non_existent_task():
    assert await get_task(uuid4()) is None

@pytest.mark.asyncio
async def test_unfinished_tasks_are_failed_on_startup():
    from src.services.db_service import fail_interrupted_tasks
    running, done = uuid4(), uuid4()
    await create_task(running, "https://a.com")
    await update_task_status(running, TaskStatus.VERIFYING)
    await create_task(done, "https://b.com")
    await update_task_status(done, TaskStatus.COMPLETED)

    assert await fail_interrupted_tasks() >= 1
    assert (await get_task(running)).status == TaskStatus.FAILED.value
    assert "restarted" in (await get_task(running)).error_message
    assert (await get_task(done)).status == TaskStatus.COMPLETED.value
