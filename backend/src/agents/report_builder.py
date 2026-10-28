"""Agent 4 - writes the narrative sections from the verified findings."""
from src.agents.llm import generate_json
import json

VERDICT_WEIGHTS = {"supported": 1.0, "partially_true": 0.5, "outdated": 0.4, "contradicted": 0.0}

SYSTEM = """
You are the Report Builder in a research and fact-checking team.
You receive a page analysis and the fact-check verdicts for its claims.
Return a JSON object with these EXACT keys:
- verdict_summary: string (3-4 sentences: overall, how reliable is this page? Mention the
  strongest confirmed points and every contradicted or outdated claim)
- validation: string (enrich the page with industry context and related concepts, informed by the verdicts)
- risks: string (biases, gaps, errors and outdated information found - one narrative paragraph)
- comparison: string (factual comparison with alternatives or competing views - one narrative paragraph)
- timeline: list of {date, event} - key dated events relevant to the topic, oldest first,
  only dates stated in the analysis or verdicts (empty list if none)

Maintain a professional research tone. Do NOT fabricate facts.
"""


def credibility_score(checks: list[dict]):
    """0-100 confidence-weighted share of checkable claims that held up.

    Unverifiable claims are left out; returns None if nothing could be checked.
    """
    weighted = [(VERDICT_WEIGHTS[c["verdict"]], max(c["confidence"], 1))
                for c in checks if c["verdict"] in VERDICT_WEIGHTS]
    if not weighted:
        return None
    return round(100 * sum(w * conf for w, conf in weighted) / sum(conf for _, conf in weighted))


async def build_report(analysis: dict, checks: list[dict]) -> dict:
    findings = [
        {"claim": c["claim"], "verdict": c["verdict"], "confidence": c["confidence"],
         "explanation": c["explanation"], "correction": c["correction"]}
        for c in checks
    ]
    prompt = (
        f"PAGE: {analysis['title']}\nTOPIC: {analysis['topic']}\n\nSUMMARY:\n{analysis['summary']}\n\n"
        f"CONTENT:\n{analysis['content'][:12000]}\n\nFACT-CHECK VERDICTS:\n{json.dumps(findings, indent=1)}"
    )
    result = await generate_json(SYSTEM, prompt, smart=True)

    timeline = [
        {"date": str(t.get("date", "")), "event": str(t.get("event", ""))}
        for t in result.get("timeline", []) or []
        if isinstance(t, dict) and t.get("date") and t.get("event")
    ]
    return {
        "verdict_summary": result.get("verdict_summary", ""),
        "validation": result.get("validation", "Information not available"),
        "risks": result.get("risks", "Information not available"),
        "comparison": result.get("comparison", "Information not available"),
        "timeline": timeline[:12],
        "credibility_score": credibility_score(checks),
    }
