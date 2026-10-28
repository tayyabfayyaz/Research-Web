from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from src.models.schemas import (
    ResearchRequest, ResearchTask, TaskStatus, ResearchDocument, ChatRequest, ChatResponse,
)
from src.agents.orchestrator import run_research
from src.agents.chat_agent import answer_question
from src.agents.llm import AIServiceError, redact
from src.services.storage import get_pdf_path
from src.services.db_service import create_task, get_task, get_all_tasks
from uuid import uuid4, UUID
from typing import List
import logging

router = APIRouter()
logger = logging.getLogger("api")

def to_response(task) -> ResearchTask:
    return ResearchTask(
        id=UUID(task.id),
        url=task.url,
        status=TaskStatus(task.status),
        document=ResearchDocument(**task.document) if task.document else None,
        progress=task.progress,
        error_message=redact(task.error_message) if task.error_message else None,
        created_at=task.created_at,
        updated_at=task.updated_at
    )

@router.post("/generate", response_model=ResearchTask, status_code=202)
async def generate_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    task_id = uuid4()
    await create_task(task_id, str(request.url))

    background_tasks.add_task(run_research, task_id, str(request.url))

    return ResearchTask(id=task_id, url=str(request.url), status=TaskStatus.PENDING)

@router.get("/status/{task_id}", response_model=ResearchTask)
async def get_status(task_id: UUID):
    task = await get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return to_response(task)

@router.get("/tasks", response_model=List[ResearchTask])
async def list_tasks():
    tasks = await get_all_tasks()
    return [to_response(task) for task in tasks]

@router.post("/chat/{task_id}", response_model=ChatResponse)
async def chat_about_report(task_id: UUID, request: ChatRequest):
    task = await get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED.value or not task.document:
        raise HTTPException(status_code=409, detail="Report is not ready yet")
    try:
        answer = await answer_question(
            task.document, request.message, [turn.model_dump() for turn in request.history]
        )
    except AIServiceError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return ChatResponse(answer=answer)

@router.get("/download/{task_id}")
async def download_pdf(task_id: UUID):
    path = get_pdf_path(task_id)
    if not path:
        raise HTTPException(status_code=404, detail="PDF not found")
    return FileResponse(path, media_type="application/pdf", filename=f"research-{task_id}.pdf")
