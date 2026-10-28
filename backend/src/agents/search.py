"""Web search and source-page reading shared by the fact checkers.

Uses Tavily when TAVILY_API_KEY is set, otherwise falls back to DuckDuckGo
(no key needed, but unofficial and easily rate limited).
"""
from html import unescape
from urllib.parse import urlparse
import asyncio
import logging
import os
import re

import httpx

logger = logging.getLogger("search")

TAVILY_URL = "https://api.tavily.com/search"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# DuckDuckGo blocks bursts of queries, so keep it to a couple at a time
_ddg_semaphore = asyncio.Semaphore(2)


def provider_name() -> str:
    return "Tavily" if os.getenv("TAVILY_API_KEY") else "DuckDuckGo"


async def web_search(query: str, max_results: int = 5) -> list[dict]:
    """Return [{title, url, snippet}] for a query."""
    try:
        if os.getenv("TAVILY_API_KEY"):
            return await _tavily_search(query, max_results)
        return await _ddg_search(query, max_results)
    except Exception as e:
        logger.warning(f"{provider_name()} search failed for {query!r}: {e}")
        return []


async def _tavily_search(query: str, max_results: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            TAVILY_URL,
            headers={"Authorization": f"Bearer {os.getenv('TAVILY_API_KEY')}"},
            json={"query": query, "max_results": max_results, "search_depth": "basic"},
        )
        response.raise_for_status()
        return [
            {"title": r.get("title", ""), "url": r["url"], "snippet": r.get("content", "")}
            for r in response.json().get("results", [])
        ]


async def _ddg_search(query: str, max_results: int) -> list[dict]:
    from ddgs import DDGS

    async with _ddg_semaphore:
        results = await asyncio.to_thread(lambda: DDGS().text(query, max_results=max_results))
    return [
        {"title": r.get("title", ""), "url": r["href"], "snippet": r.get("body", "")}
        for r in results or []
    ]


def _html_to_text(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|noscript|svg|nav|footer|header|aside)\b.*?</\1>", " ", html)
    html = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|section|article)>", "\n", html)
    text = unescape(re.sub(r"<[^>]+>", " ", html))
    lines = (re.sub(r"\s+", " ", line).strip() for line in text.split("\n"))
    return "\n".join(line for line in lines if len(line) > 40)


# Statuses bot-protection layers (Cloudflare, Akamai) return to automated clients.
# The site is up; it just won't let us read the page.
PROTECTED_STATUSES = {401, 403, 429, 503}


def link_status(status_code) -> str:
    if status_code is None:
        return "dead"
    if status_code < 400:
        return "live"
    return "protected" if status_code in PROTECTED_STATUSES else "dead"


async def fetch_excerpt(url: str, query: str, max_chars: int = 2500) -> dict:
    """Fetch a source page and keep only the paragraphs most relevant to the query.

    Returns {link_status, status, excerpt}. The link status is reused by the
    source curator so the report says which cited links actually work.
    """
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            response = await client.get(url)
        status = link_status(response.status_code)
        if status != "live" or "html" not in response.headers.get("content-type", ""):
            return {"link_status": status, "status": response.status_code, "excerpt": ""}
        text = _html_to_text(response.text[:1_500_000])
    except Exception as e:
        logger.info(f"Could not fetch {url}: {e}")
        return {"link_status": "dead", "status": None, "excerpt": ""}

    keywords = {w for w in re.findall(r"[a-z0-9]{4,}", query.lower())}
    paragraphs = text.split("\n")
    scored = sorted(
        ((sum(w in p.lower() for w in keywords), i, p) for i, p in enumerate(paragraphs)),
        reverse=True,
    )
    chosen, size = [], 0
    for score, i, p in scored:
        if score == 0 or size + len(p) > max_chars:
            continue
        chosen.append((i, p))
        size += len(p)
    excerpt = "\n".join(p for _, p in sorted(chosen))
    return {"link_status": "live", "status": response.status_code, "excerpt": excerpt}


def domain_of(url: str) -> str:
    host = urlparse(url).netloc.lower()
    return host[4:] if host.startswith("www.") else host
