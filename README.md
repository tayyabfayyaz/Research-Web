# Research.AI — AI Web Intelligence & Fact-Checking

> Paste a link. A team of AI agents reads the page, checks every important claim against independent sources, and gives you a cited, downloadable PDF report.

---

## The problem

Researchers, students, journalists and analysts start almost every investigation from a web page: an article, a blog post, a Wikipedia entry, a press release. Turning that page into something they can **trust and cite** is slow, manual work:

- **Claims are rarely verified.** Pages mix facts, opinions, outdated numbers and outright errors, and nothing on the page tells you which is which.
- **Fact-checking is tedious.** Checking one statement means writing search queries, opening several tabs, reading each source and judging whether it agrees. Doing that for every claim on a page takes hours.
- **Sources are scattered and uneven.** It is hard to tell a peer-reviewed or official source from a content farm, and links break or block readers.
- **AI summaries are not enough.** A chatbot can summarise a page, but it usually repeats the page's mistakes, invents citations, and sounds equally confident about everything.
- **The result must be shareable.** Notes spread across tabs and documents are hard to hand to a supervisor, a team or a reviewer.

## The solution

Research.AI replaces that manual workflow with a pipeline of **specialist AI agents**, coordinated by an orchestrator, that you can watch working in real time.

```
URL ──► Orchestrator
          │
          ├─► Page Analyst      reads the whole page; extracts the summary, insights and the key checkable claims
          │
          ├─► Fact Checkers     one per claim, run in parallel; search the web, read independent sources,
          │                     and return a verdict with evidence quotes
          │
          ├─► Source Curator    de-duplicates, rates credibility, checks every link, and numbers the references
          │
          ├─► Report Builder    writes validation, risks, comparison, timeline and an overall credibility score
          │
          └─► PDF Generator     produces a styled PDF with charts, a claim-to-source map and full references
```

For every claim you get:

| Verdict | Meaning |
|---|---|
| ✅ Supported | Independent sources agree |
| 🟡 Partially true | Correct in part, or missing context |
| 🕒 Outdated | Was true, but newer data says otherwise |
| ❌ Contradicted | Sources say the opposite, and the correction is given |
| ❔ Unverifiable | No reliable evidence either way |

Each verdict has a **calibrated confidence** (capped when only one site backs it), the **exact quotes** used as evidence, and **numbered citations** that link to the source list.

## Why researchers use it

- **Hours become minutes.** A full page is analysed and fact-checked in about 3–4 minutes.
- **Evidence over opinion.** Every verdict is backed by quotes from independent sources, never just the model's say-so. The original page's own domain is excluded, so it cannot vouch for itself.
- **Honest uncertainty.** Confidence drops when evidence is thin, and "unverifiable" is a valid answer. The tool does not pretend to know.
- **Better sources, ready to cite.** References are ranked by credibility (official, academic, established outlets first), marked as live, protected or dead, and include a recommended-reading list.
- **Transparent process.** The live agent workflow view and activity log show exactly what each agent did, so the result can be audited.
- **Ask follow-up questions.** A built-in chat answers questions about the report, citing the same numbered sources.
- **Share with one click.** Every report has its own link and a professional PDF to attach, print or submit.

**Typical uses:** checking sources for a literature review or thesis, verifying a news story before quoting it, due diligence on a company or product page, teaching students how to evaluate information online.

> AI can make mistakes. Research.AI points you to the evidence; always open the cited sources before relying on a verdict.

---

## Features

- Multi-agent research pipeline: analyse → fact-check → curate → write → PDF
- Live, animated agent-workflow view with per-claim progress, activity log and timer
- Credibility score, verdict breakdown, "needs attention" list and timeline
- Credibility-rated, link-checked source list with recommended reading
- Follow-up chat grounded in the report
- PDF export with charts, claim-to-source map and references
- Modern responsive interface with light/dark theme toggle
- Pluggable web search: Tavily (if a key is set) or DuckDuckGo (free, no key)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, lucide-react |
| Backend | FastAPI, SQLAlchemy (async) + SQLite |
| AI | Google Gemini (`google-genai`), custom Python orchestration |
| Web search | Tavily API or DuckDuckGo (`ddgs`) |
| Scraping and PDF | Playwright (Chromium) |

## Project structure

```
backend/
  main.py                 FastAPI app
  src/agents/             orchestrator, page_analyst, fact_checker, source_curator,
                          report_builder, chat_agent, llm, search
  src/api/routes.py       REST API
  src/services/           database, scraping and PDF services
  tests/                  pytest suite
frontend/
  src/pages/              home, /report/[id], PDF template
  src/components/         workflow, report and layout components
specs/                    feature specification, plan and tasks
```

## Getting started

### Prerequisites

- Python 3.12+
- Node.js 20+
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/))

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your-gemini-key
# Optional
TAVILY_API_KEY=your-tavily-key     # better search; DuckDuckGo is used if unset
FRONTEND_URL=http://localhost:3000
MAX_CLAIMS=8                       # claims extracted per page
FACT_CHECK_CONCURRENCY=3           # fact checkers running in parallel
```

Run it:

```bash
uvicorn main:app --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run it:

```bash
npm run dev
```

Open **http://localhost:3000**, paste a URL and watch the agents work.

### Advanced settings (`backend/.env`)

| Variable | Default | Purpose |
|---|---|---|
| `GEMINI_MODEL_SMART` | `gemini-flash-latest` | Model for analysis and fact-checking |
| `GEMINI_MODEL_FAST` | `gemini-flash-lite-latest` | Fallback and chat model |
| `AI_TIMEOUT_SECONDS` | `180` | Timeout for smart-model calls |
| `AI_FAST_TIMEOUT_SECONDS` | `60` | Timeout for fast-model calls |
| `AI_MAX_CONCURRENCY` | `4` | Maximum simultaneous AI requests |
| `DATABASE_URL` | SQLite `research.db` | Database connection |

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/generate` | Start a research run for a URL |
| `GET` | `/api/status/{id}` | Run status, live agent progress and the finished report |
| `GET` | `/api/tasks` | Recent reports |
| `GET` | `/api/download/{id}` | Download the PDF |
| `POST` | `/api/chat/{id}` | Ask a follow-up question about a finished report |

## Running tests

```bash
cd backend
venv\Scripts\python -m pytest
```

---

© 2026 IotaDev. All rights reserved.
