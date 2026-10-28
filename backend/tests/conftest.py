import os
import tempfile

import pytest_asyncio

# Point the app at a throwaway database before any app module is imported
_db_dir = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{os.path.join(_db_dir, 'test.db')}"


@pytest_asyncio.fixture
async def db():
    from src.models.database import init_db
    await init_db()
