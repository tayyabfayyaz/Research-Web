"""Main agent - plans the research run, hands work to the specialist agents
and publishes live progress for the UI.

    Page Analyst -> Fact Checkers (one per claim, in parallel) -> Source Curator -> Report Builder
"""
from datetime import datetime
from uuid import UUID
import asyncio
import logging
import os

from playwright.async_api import Error as PlaywrightError, TimeoutError as PlaywrightTimeout

from src.agents.fact_checker import check_claim
from src.agents.llm import AIServiceError, redact
from src.agents.page_analyst import analyze_page
from src.agents.report_builder import build_report
from src.agents.search import provider_name
from src.agents.source_curator import curate_sources
from src.models.schemas import TaskStatus
from src.services.db_service import update_task_status, update_task_progress
from src.services.pdf_service import generate_pdf_from_template
from src.services.storage import save_pdf

logger = logging.getLogger("orchestrator")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
MAX_LOG_ENTRIES = 40
# How many fact checkers work at once; the rest wait in the queue
FACT_CHECK_CONCURRENCY = int(os.getenv("FACT_CHECK_CONCURRENCY", "3"))

AGENTS = [
    ("orchestrator", "Orchestrator", "Plans the run and hands out work"),
    ("analyst", "Page Analyst", "Reads the full page and extracts claims"),
    ("fact_checker", "Fact Checkers", "Verify each claim against the web"),
    ("curator", "Source Curator", "Rates and de-duplicates sources"),
    ("builder", "Report Builder", "Writes the report and renders the PDF"),
]


class ProgressTracker:
    """Keeps the per-agent state and writes it to the task record."""

    def __init__(self, task_id: UUID):
        self.task_id = task_id
        self.state = {
            "agents": [
                {"id": aid, "name": name, "role": role, "status": "waiting", "detail": "", "done": 0, "total": 0}
                for aid, name, role in AGENTS
            ],
            "log": [],
            # One entry per fact-check job, so the UI can draw the fan-out
            "claims": [],
        }
        self._lock = asyncio.Lock()

    def _agent(self, agent_id: str) -> dict:
        return next(a for a in self.state["agents"] if a["id"] == agent_id)

    async def set_claims(self, claims: list[dict]):
        async with self._lock:
            self.state["claims"] = [
                {"id": i, "claim": c["claim"], "status": "queued", "verdict": None, "confidence": None}
                for i, c in enumerate(claims, start=1)
            ]
            await update_task_progress(self.task_id, self.state)

    async def update_claim(self, claim_id: int, **fields):
        async with self._lock:
            next(c for c in self.state["claims"] if c["id"] == claim_id).update(fields)
            await update_task_progress(self.task_id, self.state)

    async def update(self, agent_id: str, status: str = None, detail: str = None,
                     done: int = None, total: int = None, log: str = None):
        async with self._lock:
            agent = self._agent(agent_id)
            if status is not None:
                agent["status"] = status
            if detail is not None:
                agent["detail"] = detail
            if done is not None:
                agent["done"] = done
            if total is not None:
                agent["total"] = total
            if log:
                self.state["log"].append({"time": datetime.now().isoformat(timespec="seconds"),
                                          "agent": agent["name"], "message": log})
                self.state["log"] = self.state["log"][-MAX_LOG_ENTRIES:]
            await update_task_progress(self.task_id, self.state)

    def reporter(self, agent_id: str):
        """A callback an agent can use to report what it is doing right now."""
        async def report(detail: str):
            await self.update(agent_id, detail=detail, log=detail)
        return report

    async def fail_running(self):
        for agent in self.state["agents"]:
            if agent["status"] == "running":
                await self.update(agent["id"], status="failed")


def public_error(error: Exception) -> str:
    if isinstance(error, (AIServiceError, ValueError)):
        return redact(str(error))
    if isinstance(error, PlaywrightTimeout):
        return "The page took too long to load"
    if isinstance(error, PlaywrightError):
        return f"Could not load the page: {str(error).splitlines()[0]}"
    return "Research failed due to an internal error"


async def run_research(task_id: UUID, url: str):
    progress = ProgressTracker(task_id)
    try:
        await progress.update("orchestrator", status="running", detail="Planning research run",
                              log=f"Research started for {url} (web search: {provider_name()})")

        # 1. Page Analyst
        await update_task_status(task_id, TaskStatus.ANALYZING)
        await progress.update("analyst", status="running")
        analysis = await analyze_page(url, progress.reporter("analyst"))
        claims = analysis["claims"]
        await progress.update("analyst", status="done", detail=f"Found {len(claims)} checkable claims",
                              log=f"Extracted {len(claims)} claims from '{analysis['title']}'")

        # 2. Fact Checkers - one per claim, in parallel
        await update_task_status(task_id, TaskStatus.VERIFYING)
        await progress.update("orchestrator", detail=f"Dispatched {len(claims)} fact checkers")
        await progress.set_claims(claims)
        await progress.update("fact_checker", status="running", done=0, total=len(claims),
                              detail=f"Checking {len(claims)} claims")
        finished = 0
        checker_slots = asyncio.Semaphore(FACT_CHECK_CONCURRENCY)

        async def run_check(claim_id: int, claim: dict):
            nonlocal finished
            async with checker_slots:
                await progress.update_claim(claim_id, status="checking")
                try:
                    result = await check_claim(claim_id, claim, url, analysis["topic"])
                except AIServiceError as e:
                    # One failed check shouldn't sink the whole report
                    result = {"id": claim_id, **claim, "verdict": "unverifiable", "confidence": 0,
                              "explanation": f"Check could not be completed: {e}", "correction": "",
                              "evidence": [], "sources": []}
            await progress.update_claim(claim_id, status="done", verdict=result["verdict"],
                                        confidence=result["confidence"])
            finished += 1
            label = result["verdict"].replace("_", " ")
            await progress.update("fact_checker", done=finished,
                                  detail=f"Checked {finished} of {len(claims)} claims",
                                  log=f"Claim {claim_id}: {label} ({result['confidence']}%)")
            return result

        checks = list(await asyncio.gather(*(run_check(i, c) for i, c in enumerate(claims, start=1))))
        await progress.update("fact_checker", status="done", detail=f"All {len(claims)} claims checked")

        # 3. Source Curator
        await update_task_status(task_id, TaskStatus.CURATING)
        await progress.update("curator", status="running", detail="Merging and rating sources")
        sources = curate_sources(checks)
        live = sum(s["link_status"] != "dead" for s in sources)
        await progress.update("curator", status="done", detail=f"{len(sources)} sources, {live} working links",
                              log=f"Curated {len(sources)} unique sources ({live} working links)")

        # 4. Report Builder - narrative sections, then the PDF
        await update_task_status(task_id, TaskStatus.WRITING)
        await progress.update("builder", status="running", detail="Writing report sections")
        narrative = await build_report(analysis, checks)

        document = {
            "title": analysis["title"],
            "source_url": url,
            "summary": analysis["summary"],
            "insights": analysis["insights"],
            "content": analysis["content"],
            "validation": narrative["validation"],
            "risks": narrative["risks"],
            "comparison": narrative["comparison"],
            "verdict_summary": narrative["verdict_summary"],
            "credibility_score": narrative["credibility_score"],
            "timeline": narrative["timeline"],
            "claims": checks,
            "sources": sources,
        }

        await update_task_status(task_id, TaskStatus.GENERATING, document=document)
        await progress.update("builder", detail="Rendering PDF with diagrams", log="Report written - rendering PDF")
        pdf_bytes = await generate_pdf_from_template(str(task_id), FRONTEND_URL)
        save_pdf(task_id, pdf_bytes)
        await progress.update("builder", status="done", detail="PDF ready")

        await progress.update("orchestrator", status="done", detail="Research complete", log="Research complete")
        await update_task_status(task_id, TaskStatus.COMPLETED)

    except Exception as e:
        logger.error(f"Task {task_id} failed: {redact(str(e))}", exc_info=True)
        message = public_error(e)
        await progress.fail_running()
        await progress.update("orchestrator", status="failed", detail=message, log=f"Failed: {message}")
        await update_task_status(task_id, TaskStatus.FAILED, error_message=message)
