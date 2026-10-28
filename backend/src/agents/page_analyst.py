"""Agent 1 - reads the whole page and pulls out the claims worth checking."""
from src.agents.llm import generate_json
from src.services.scraper import scrape_url
import os

MAX_CLAIMS = int(os.getenv("MAX_CLAIMS", "8"))

SYSTEM = f"""
You are the Page Analyst in a research and fact-checking team.
Read the website content and return a JSON object with these EXACT keys:
- title: string (the page's subject in a few words)
- topic: string (one sentence: what the page is about)
- summary: string (concise executive summary, no fluff)
- insights: list of strings (the most impactful ideas, 4-6 bullets)
- content: string (the page's core content restructured with markdown: "### " headings, "- " bullets, **bold**)
- claims: list of objects {{claim, quote, query}} - the {MAX_CLAIMS} most important factual claims
  the page makes that can be checked against independent sources.
  * claim: one self-contained, specific statement (names, numbers, dates spelled out; no "it"/"this")
  * quote: the exact sentence from the page the claim comes from
  * query: a short web search query (3-7 keywords) that would find independent sources on this claim
  Prefer concrete facts (dates, figures, attributions, cause/effect) over opinions or marketing language.

Do NOT fabricate facts. Only use information from the provided content.
If something is missing, state 'Information not available'.
"""


async def analyze_page(url: str, report) -> dict:
    await report("Loading page in headless browser")
    scraped = await scrape_url(url)

    await report(f"Read {len(scraped['content']):,} characters - extracting claims")
    prompt = (
        f"URL: {url}\nPage title: {scraped['title']}\nMeta description: {scraped['description']}\n\n"
        f"Website content:\n\n{scraped['content']}"
    )
    analysis = await generate_json(SYSTEM, prompt, smart=True)

    claims = []
    for item in analysis.get("claims", [])[:MAX_CLAIMS]:
        if isinstance(item, dict) and item.get("claim"):
            claims.append({
                "claim": str(item["claim"]),
                "quote": str(item.get("quote") or ""),
                "query": str(item.get("query") or ""),
            })

    return {
        "title": analysis.get("title") or scraped["title"],
        "topic": analysis.get("topic", ""),
        "summary": analysis.get("summary", "Information not available"),
        "insights": [str(i) for i in analysis.get("insights", [])],
        "content": analysis.get("content", "Information not available"),
        "claims": claims,
    }
