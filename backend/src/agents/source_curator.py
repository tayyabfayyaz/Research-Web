"""Agent 3 - turns every source the fact checkers touched into one clean,
de-duplicated reference list with a credibility rating.

Deterministic on purpose: no LLM is involved, so it can't invent links.
"""
from src.agents.search import domain_of
import re

HIGH_CREDIBILITY = {
    "reuters.com", "apnews.com", "bbc.com", "bbc.co.uk", "nature.com", "science.org",
    "nih.gov", "who.int", "britannica.com", "iso.org", "w3.org", "ietf.org", "ieee.org",
    "acm.org", "arxiv.org", "nasa.gov", "un.org", "worldbank.org", "imf.org", "oecd.org",
    "nytimes.com", "theguardian.com", "economist.com", "ft.com", "wsj.com", "pdfa.org",
}
LOW_CREDIBILITY = {
    "reddit.com", "quora.com", "medium.com", "pinterest.com", "facebook.com", "x.com",
    "twitter.com", "tiktok.com", "instagram.com", "youtube.com", "answers.com",
}
HIGH_SUFFIXES = (".gov", ".edu", ".int", ".mil", ".ac.uk", ".gov.uk")


def rate_credibility(domain: str) -> str:
    base = ".".join(domain.split(".")[-2:])
    if domain.endswith(HIGH_SUFFIXES) or domain in HIGH_CREDIBILITY or base in HIGH_CREDIBILITY:
        return "high"
    if domain in LOW_CREDIBILITY or base in LOW_CREDIBILITY or "blog" in domain:
        return "low"
    return "medium"


def _normalize(url: str) -> str:
    return url.split("#")[0].rstrip("/").replace("http://", "https://").replace("://www.", "://")


def curate_sources(checks: list[dict]) -> list[dict]:
    """Merge sources across claims and link each claim's evidence to source ids."""
    by_url: dict[str, dict] = {}

    for check in checks:
        cited = {_normalize(e["url"]): e["stance"] for e in check.get("evidence", [])}
        for url in _explanation_citations(check):
            cited.setdefault(_normalize(url), "context")
        for source in check.get("sources", []):
            key = _normalize(source["url"])
            entry = by_url.setdefault(key, {
                "title": _clean_title(source.get("title") or "") or domain_of(source["url"]),
                "url": source["url"],
                "domain": domain_of(source["url"]),
                "credibility": rate_credibility(domain_of(source["url"])),
                "link_status": source.get("link_status", "dead"),
                "claim_ids": [],
                "stances": [],
            })
            if key in cited and check["id"] not in entry["claim_ids"]:
                entry["claim_ids"].append(check["id"])
                entry["stances"].append(cited[key])

    rank = {"high": 0, "medium": 1, "low": 2}
    sources = [s for s in by_url.values() if s["claim_ids"]]  # only keep sources actually cited
    sources.sort(key=lambda s: (rank[s["credibility"]], -len(s["claim_ids"])))
    for number, s in enumerate(sources, start=1):
        s["id"] = number
        # "Recommended reading": link works, trustworthy, and backs up at least one verified fact
        s["recommended"] = s["link_status"] != "dead" and s["credibility"] != "low" and "supports" in s["stances"]
        del s["stances"]

    for check in checks:
        for item in check.get("evidence", []):
            item["source_id"] = by_url[_normalize(item["url"])]["id"]
        _renumber_citations(check, by_url)
        check.pop("sources", None)  # raw search results are no longer needed
        check.pop("citation_urls", None)
    return sources


CITATION = re.compile(r"\[(\d+)\]")
MAX_TITLE = 110


def _clean_title(title: str) -> str:
    title = " ".join(title.split())
    return title if len(title) <= MAX_TITLE else title[:MAX_TITLE].rsplit(" ", 1)[0] + "…"


def _explanation_citations(check: dict) -> list[str]:
    urls = check.get("citation_urls", [])
    text = f"{check.get('explanation', '')} {check.get('correction', '')}"
    return [urls[int(n) - 1] for n in CITATION.findall(text) if 1 <= int(n) <= len(urls)]


def _renumber_citations(check: dict, by_url: dict[str, dict]):
    """Rewrite the fact checker's local [n] markers to the report-wide source ids."""
    urls = check.get("citation_urls", [])

    def replace(match):
        n = int(match.group(1))
        entry = by_url.get(_normalize(urls[n - 1])) if 1 <= n <= len(urls) else None
        return f"[{entry['id']}]" if entry and "id" in entry else ""

    for field in ("explanation", "correction"):
        if check.get(field):
            check[field] = re.sub(r"\s+([,.;])", r"\1", CITATION.sub(replace, check[field])).strip()
