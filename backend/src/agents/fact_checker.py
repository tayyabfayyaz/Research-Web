"""Agent 2 - verifies one claim against independent web sources.

The orchestrator runs one of these per claim, in parallel.
"""
from src.agents.llm import generate_json
from src.agents.search import web_search, fetch_excerpt, domain_of
import asyncio
import re

VERDICTS = {"supported", "contradicted", "partially_true", "outdated", "unverifiable"}
STANCES = {"supports", "contradicts", "context"}
SOURCES_TO_READ = 4

SYSTEM = """
You are a Fact Checker. Judge ONE claim using ONLY the numbered sources provided.
Never use a source number that is not in the list. Never invent sources or quotes.
Return a JSON object with these EXACT keys:
- verdict: one of "supported", "contradicted", "partially_true", "outdated", "unverifiable"
  * supported: sources clearly confirm the claim
  * contradicted: sources clearly say otherwise
  * partially_true: some parts are right, some are wrong or overstated
  * outdated: was true but sources show newer information
  * unverifiable: the sources do not settle it either way
- confidence: integer 0-100 (how sure you are of the verdict; a verdict resting on a single
  source, or on sources that only touch the claim indirectly, should not exceed 60)
- explanation: string (2-3 sentences: why, citing sources like [1], [2])
- correction: string (the accurate statement if the verdict is not "supported", else "")
- evidence: list of {source, quote, stance}
  * source: the source number
  * quote: a short passage copied from that source
  * stance: "supports", "contradicts" or "context"
"""


STOPWORDS = {
    "the", "a", "an", "of", "in", "on", "for", "to", "and", "or", "is", "was", "were", "are", "be",
    "by", "with", "as", "at", "from", "that", "this", "its", "it", "has", "have", "had", "which",
}


def search_queries(claim: dict) -> list[str]:
    """Most specific query first; search engines often return nothing for long sentences."""
    words = [w for w in re.findall(r"[\w'.-]+", claim["claim"]) if w.lower() not in STOPWORDS]
    candidates = [claim.get("query", ""), claim["claim"], " ".join(words[:8])]
    queries = []
    for q in candidates:
        if q and q not in queries:
            queries.append(q)
    return queries


async def find_sources(claim: dict, page_domain: str) -> list[dict]:
    for query in search_queries(claim):
        results = await web_search(query, max_results=8)
        # The page being checked can't verify itself
        results = [r for r in results if domain_of(r["url"]) != page_domain]
        if results:
            return results[:SOURCES_TO_READ]
    return []


async def check_claim(claim_id: int, claim: dict, page_url: str, topic: str) -> dict:
    page_domain = domain_of(page_url)
    results = await find_sources(claim, page_domain)
    claim = {"claim": claim["claim"], "quote": claim.get("quote", "")}

    pages = await asyncio.gather(*(fetch_excerpt(r["url"], claim["claim"]) for r in results))
    sources = [
        {**r, "link_status": p["link_status"], "excerpt": p["excerpt"] or r["snippet"]}
        for r, p in zip(results, pages)
    ]
    usable = [s for s in sources if s["excerpt"]]

    if not usable:
        return {
            "id": claim_id, **claim, "verdict": "unverifiable", "confidence": 0,
            "explanation": "No independent sources could be found for this claim.",
            "correction": "", "evidence": [], "sources": sources,
        }

    numbered = "\n\n".join(
        f"[{i}] {s['title']} ({s['url']})\n{s['excerpt']}" for i, s in enumerate(usable, start=1)
    )
    prompt = f"Page topic: {topic}\n\nCLAIM: {claim['claim']}\n\nSOURCES:\n\n{numbered}"
    result = await generate_json(SYSTEM, prompt, smart=False)

    verdict = str(result.get("verdict", "")).lower()
    try:
        confidence = max(0, min(100, int(result.get("confidence", 50))))
    except (TypeError, ValueError):
        confidence = 50

    evidence = []
    for item in result.get("evidence", []) or []:
        try:
            index = int(item.get("source"))
        except (TypeError, ValueError, AttributeError):
            continue
        if 1 <= index <= len(usable):  # drop citations to sources we never gave it
            stance = item.get("stance") if item.get("stance") in STANCES else "context"
            evidence.append({"url": usable[index - 1]["url"], "quote": str(item.get("quote", ""))[:400], "stance": stance})

    verdict = verdict if verdict in VERDICTS else "unverifiable"
    return {
        "id": claim_id,
        **claim,
        "verdict": verdict,
        "confidence": calibrate_confidence(verdict, confidence, evidence),
        "explanation": str(result.get("explanation", "")),
        "correction": str(result.get("correction") or ""),
        "evidence": evidence,
        "sources": usable,
        # The model cites sources by its own [n] numbering; the curator maps these to final ids
        "citation_urls": [s["url"] for s in usable],
    }


# Which evidence stance has to back up each verdict
AGREEING_STANCES = {
    "supported": {"supports"},
    "contradicted": {"contradicts"},
    "outdated": {"contradicts"},
    "partially_true": {"supports", "contradicts"},
}
SINGLE_SOURCE_CAP = 65
NO_EVIDENCE_CAP = 40


def calibrate_confidence(verdict: str, confidence: int, evidence: list[dict]) -> int:
    """Models are overconfident; a verdict is only as strong as the independent sites behind it."""
    if verdict not in AGREEING_STANCES:
        return confidence
    domains = {domain_of(e["url"]) for e in evidence if e["stance"] in AGREEING_STANCES[verdict]}
    if not domains:
        return min(confidence, NO_EVIDENCE_CAP)
    if len(domains) == 1:
        return min(confidence, SINGLE_SOURCE_CAP)
    return confidence
