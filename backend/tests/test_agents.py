import pytest
from unittest.mock import patch, AsyncMock
from uuid import uuid4

from src.agents.source_curator import curate_sources, rate_credibility
from src.agents.report_builder import credibility_score
from src.agents.llm import redact
from src.models.schemas import TaskStatus


def test_rate_credibility():
    assert rate_credibility("nasa.gov") == "high"
    assert rate_credibility("en.reuters.com") == "high"
    assert rate_credibility("reddit.com") == "low"
    assert rate_credibility("myblog.example.com") == "low"
    assert rate_credibility("example.com") == "medium"


def test_curate_sources_dedupes_and_links_evidence():
    checks = [
        {"id": 1, "evidence": [{"url": "https://www.nasa.gov/x", "stance": "supports"}],
         "sources": [{"url": "https://www.nasa.gov/x", "title": "NASA", "link_status": "live"},
                     {"url": "https://uncited.com/a", "title": "U", "link_status": "live"}]},
        {"id": 2, "evidence": [{"url": "http://nasa.gov/x/", "stance": "contradicts"},
                               {"url": "https://reddit.com/r", "stance": "supports"}],
         "sources": [{"url": "http://nasa.gov/x/", "title": "NASA", "link_status": "live"},
                     {"url": "https://reddit.com/r", "title": "R", "link_status": "dead"}]},
    ]
    sources = curate_sources(checks)

    # Same page under different URL spellings is one source; uncited results are dropped
    assert [s["domain"] for s in sources] == ["nasa.gov", "reddit.com"]
    assert [s["id"] for s in sources] == [1, 2]
    assert sources[0]["claim_ids"] == [1, 2]
    assert sources[0]["recommended"] is True
    assert sources[1]["recommended"] is False  # low credibility and dead link
    assert [e["source_id"] for c in checks for e in c["evidence"]] == [1, 1, 2]
    assert all("sources" not in c for c in checks)


def test_credibility_score():
    assert credibility_score([]) is None
    assert credibility_score([{"verdict": "unverifiable", "confidence": 80}]) is None
    assert credibility_score([{"verdict": "supported", "confidence": 90},
                              {"verdict": "contradicted", "confidence": 90}]) == 50
    # Unverifiable claims don't drag the score down
    assert credibility_score([{"verdict": "supported", "confidence": 70},
                              {"verdict": "unverifiable", "confidence": 0}]) == 100


def test_redact_hides_api_keys():
    text = "Consumer 'api_key:AQ.FAKEfakeFAKEfakeFAKEfake1234' and AIzaFAKEfakeFAKEfakeFAKEfake1234567"
    assert "AQ.FAKE" not in redact(text)
    assert "AIza" not in redact(text)


@pytest.mark.asyncio
async def test_fact_checker_drops_citations_to_unknown_sources():
    from src.agents import fact_checker

    search = AsyncMock(return_value=[
        {"title": "Page itself", "url": "https://checked-site.com/p", "snippet": "self"},
        {"title": "Source A", "url": "https://a.org/1", "snippet": "a"},
    ])
    fetch = AsyncMock(return_value={"link_status": "live", "status": 200, "excerpt": "evidence text"})
    llm = AsyncMock(return_value={
        "verdict": "supported", "confidence": 140, "explanation": "ok [1]", "correction": "",
        "evidence": [{"source": 1, "quote": "evidence", "stance": "supports"},
                     {"source": 7, "quote": "made up", "stance": "supports"}],
    })
    with patch.object(fact_checker, "web_search", search), \
         patch.object(fact_checker, "fetch_excerpt", fetch), \
         patch.object(fact_checker, "generate_json", llm):
        result = await fact_checker.check_claim(1, {"claim": "c", "quote": "q"}, "https://checked-site.com/p", "t")

    assert result["verdict"] == "supported"
    assert result["confidence"] == 65  # clamped to 100, then capped: only one site agrees
    assert [e["url"] for e in result["evidence"]] == ["https://a.org/1"]
    assert [s["url"] for s in result["sources"]] == ["https://a.org/1"]  # the checked page is excluded


@pytest.mark.asyncio
async def test_fact_checker_without_sources_is_unverifiable():
    from src.agents import fact_checker

    with patch.object(fact_checker, "web_search", AsyncMock(return_value=[])), \
         patch.object(fact_checker, "generate_json", AsyncMock()) as llm:
        result = await fact_checker.check_claim(1, {"claim": "c", "quote": ""}, "https://x.com", "t")

    assert result["verdict"] == "unverifiable"
    llm.assert_not_called()


@pytest.mark.asyncio
async def test_progress_tracker_persists_agent_state(db):
    from src.agents.orchestrator import ProgressTracker
    from src.services.db_service import create_task, get_task

    task_id = uuid4()
    await create_task(task_id, "https://example.com")
    tracker = ProgressTracker(task_id)
    await tracker.update("fact_checker", status="running", done=2, total=5, log="Claim 2: supported")

    task = await get_task(task_id)
    checker = next(a for a in task.progress["agents"] if a["id"] == "fact_checker")
    assert checker["status"] == "running" and checker["done"] == 2 and checker["total"] == 5
    assert task.progress["log"][-1]["message"] == "Claim 2: supported"


@pytest.mark.asyncio
async def test_chat_requires_completed_report(db):
    from src.api.routes import chat_about_report
    from src.models.schemas import ChatRequest
    from src.services.db_service import create_task
    from fastapi import HTTPException

    task_id = uuid4()
    await create_task(task_id, "https://example.com")
    with pytest.raises(HTTPException) as error:
        await chat_about_report(task_id, ChatRequest(message="hi"))
    assert error.value.status_code == 409


def test_link_status_separates_bot_protection_from_dead_links():
    from src.agents.search import link_status
    assert link_status(200) == "live"
    assert link_status(403) == "protected"  # Cloudflare/Akamai challenge - the site is up
    assert link_status(404) == "dead"
    assert link_status(None) == "dead"  # DNS or connection failure


def test_search_queries_fall_back_to_shorter_queries():
    from src.agents.fact_checker import search_queries
    claim = {"claim": "The PDF Association made ISO 32000-2 available for download free of charge in April 2023.",
             "query": "ISO 32000-2 free download PDF Association"}
    queries = search_queries(claim)
    assert queries[0] == claim["query"]
    assert queries[1] == claim["claim"]
    assert queries[2] == "PDF Association made ISO 32000-2 available download free"  # first 8 keywords
    # Without an analyst-written query, the full claim comes first
    assert search_queries({"claim": "Short claim"}) == ["Short claim"]


@pytest.mark.asyncio
async def test_fact_checker_retries_with_next_query_when_search_is_empty():
    from src.agents import fact_checker

    search = AsyncMock(side_effect=[[], [{"title": "A", "url": "https://a.org/1", "snippet": "a"}]])
    fetch = AsyncMock(return_value={"link_status": "protected", "status": 403, "excerpt": ""})
    llm = AsyncMock(return_value={"verdict": "supported", "confidence": 80, "explanation": "", "evidence": []})
    with patch.object(fact_checker, "web_search", search), \
         patch.object(fact_checker, "fetch_excerpt", fetch), \
         patch.object(fact_checker, "generate_json", llm):
        result = await fact_checker.check_claim(1, {"claim": "c d e", "quote": "", "query": "q"}, "https://x.com", "t")

    assert search.await_count == 2
    # A protected page can't be read, so the search snippet is used as the excerpt
    assert result["sources"][0]["excerpt"] == "a"
    assert result["sources"][0]["link_status"] == "protected"
    assert "query" not in result


def test_confidence_is_capped_without_independent_agreement():
    from src.agents.fact_checker import calibrate_confidence
    one_site = [{"url": "https://a.org/1", "stance": "contradicts"}, {"url": "https://www.a.org/2", "stance": "contradicts"}]
    two_sites = one_site + [{"url": "https://b.org", "stance": "contradicts"}]
    context_only = [{"url": "https://a.org/1", "stance": "context"}]

    assert calibrate_confidence("contradicted", 90, one_site) == 65
    assert calibrate_confidence("contradicted", 90, two_sites) == 90
    assert calibrate_confidence("supported", 100, context_only) == 40
    assert calibrate_confidence("unverifiable", 0, []) == 0


def test_curator_renumbers_explanation_citations_to_report_ids():
    checks = [
        {"id": 1, "explanation": "Confirmed [1].", "correction": "",
         "citation_urls": ["https://a.com/x"],
         "evidence": [{"url": "https://a.com/x", "stance": "supports"}],
         "sources": [{"url": "https://a.com/x", "title": "A", "link_status": "live"}]},
        {"id": 2, "explanation": "Per [2], wrong; see also [1] and [9].", "correction": "Right per [2].",
         "citation_urls": ["https://nasa.gov/y", "https://b.com/z"],
         "evidence": [{"url": "https://b.com/z", "stance": "contradicts"}],
         "sources": [{"url": "https://nasa.gov/y", "title": "N", "link_status": "live"},
                     {"url": "https://b.com/z", "title": "B " * 80, "link_status": "live"}]},
    ]
    sources = curate_sources(checks)
    ids = {s["domain"]: s["id"] for s in sources}

    # nasa.gov is cited only in the explanation, but still makes the reference list (and ranks first)
    assert ids == {"nasa.gov": 1, "a.com": 2, "b.com": 3}
    assert checks[0]["explanation"] == "Confirmed [2]."
    assert checks[1]["explanation"] == "Per [3], wrong; see also [1] and."  # [9] never existed and is dropped
    assert checks[1]["correction"] == "Right per [3]."
    assert len(next(s for s in sources if s["domain"] == "b.com")["title"]) <= 111
    assert all("citation_urls" not in c for c in checks)


@pytest.mark.asyncio
async def test_llm_retries_dropped_connections():
    import httpx
    from src.agents import llm

    response = type("R", (), {"text": '{"ok": true}'})()
    generate = AsyncMock(side_effect=[httpx.ReadError("connection dropped"), response])
    with patch.object(llm.client.aio.models, "generate_content", generate), \
         patch.object(llm.asyncio, "sleep", AsyncMock()):
        assert await llm.generate_json("system", "prompt", smart=False) == {"ok": True}
    assert generate.await_count == 2


@pytest.mark.asyncio
async def test_progress_tracker_records_each_fact_check(db):
    from src.agents.orchestrator import ProgressTracker
    from src.services.db_service import create_task, get_task

    task_id = uuid4()
    await create_task(task_id, "https://example.com")
    tracker = ProgressTracker(task_id)
    await tracker.set_claims([{"claim": "first"}, {"claim": "second"}])
    await tracker.update_claim(2, status="done", verdict="supported", confidence=80)

    claims = (await get_task(task_id)).progress["claims"]
    assert [c["status"] for c in claims] == ["queued", "done"]
    assert claims[1]["verdict"] == "supported" and claims[1]["claim"] == "second"
