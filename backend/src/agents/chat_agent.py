"""Answers follow-up questions about a finished report."""
from src.agents.llm import generate_json
import json

MAX_HISTORY = 10

SYSTEM = """
You are a research assistant answering follow-up questions about a fact-check report.
Answer ONLY from the report provided. When citing evidence, cite SOURCES by their source_number in
brackets, like [12]. Refer to claims in words or as "claim 3" - never put a claim_number in brackets.
If the report doesn't cover the question, say so plainly and suggest what to research next.
Be concise: 2-6 sentences unless the user asks for more detail.
Return a JSON object: {"answer": string}
"""


def _report_context(document: dict) -> str:
    claims = [
        {"claim_number": c.get("id"), "claim": c.get("claim"), "verdict": c.get("verdict"),
         "confidence": c.get("confidence"), "explanation": c.get("explanation"),
         "correction": c.get("correction"),
         "cited_source_numbers": sorted({e.get("source_id") for e in c.get("evidence", []) if e.get("source_id")})}
        for c in document.get("claims", [])
    ]
    sources = [
        {"source_number": s["id"], "title": s["title"], "url": s["url"], "credibility": s["credibility"]}
        for s in document.get("sources", [])
    ]
    return json.dumps({
        "title": document.get("title"),
        "source_url": document.get("source_url"),
        "summary": document.get("summary"),
        "credibility_score": document.get("credibility_score"),
        "verdict_summary": document.get("verdict_summary"),
        "insights": document.get("insights"),
        "content": (document.get("content") or "")[:8000],
        "risks": document.get("risks"),
        "comparison": document.get("comparison"),
        "claims": claims,
        "sources": sources,
    }, indent=1)


async def answer_question(document: dict, question: str, history: list[dict]) -> str:
    transcript = "\n".join(
        f"{'User' if turn['role'] == 'user' else 'Assistant'}: {turn['content']}"
        for turn in history[-MAX_HISTORY:]
    )
    prompt = f"REPORT:\n{_report_context(document)}\n\nCONVERSATION SO FAR:\n{transcript}\n\nUser: {question}"
    result = await generate_json(SYSTEM, prompt, smart=False)
    return str(result.get("answer", "")).strip() or "I couldn't produce an answer - please rephrase."
