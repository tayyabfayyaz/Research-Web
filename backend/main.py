from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as research_router
from src.api.middleware import error_handling_middleware
from src.models.database import init_db
from src.services.db_service import fail_interrupted_tasks
import asyncio
import sys
from contextlib import asynccontextmanager

# Windows-specific: Playwright requires ProactorEventLoop for subprocesses
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await fail_interrupted_tasks()
    yield

app = FastAPI(title="AI Web Intelligence API", lifespan=lifespan)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_error_handling(request, call_next):
    return await error_handling_middleware(request, call_next)

app.include_router(research_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "AI Web Intelligence API is running"}
