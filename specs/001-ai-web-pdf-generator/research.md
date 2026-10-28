# Research: AI Web Intelligence With PDF Generator

**Feature**: AI Web Intelligence With PDF Generator
**Date**: 2026-05-05

## Technical Decisions

### 1. Scraping Engine: Playwright (Python)
- **Decision**: Use Playwright with the `chromium` browser in FastAPI.
- **Rationale**: Playwright handles dynamic content (SPAs) better than simple fetch. The Python async API is robust and integrates perfectly with FastAPI.
- **Alternatives considered**: `BeautifulSoup` (too simple, no JS), `Selenium` (slower, older API).

### 2. AI Processing Layer: Gemini (google-generativeai)
- **Decision**: Use `gemini-2.0-flash` for speed and cost-effectiveness.
- **Rationale**: The 1M+ context window is ideal for long web pages. We will use System Instructions to enforce the Constitution's 6-section structure. Updated from 1.5-flash which is deprecated in 2026.

### 3. PDF Generation: Puppeteer (Node.js/Next.js)
- **Decision**: The Next.js frontend will host a specialized `/export/pdf` route. Puppeteer will "print" this route to a PDF.
- **Rationale**: This allows us to use React/Tailwind for "Clean Typography" and "Section Hierarchy" instead of fighting with lower-level PDF libraries like `pdfkit` or `ReportLab`.
- **Alternatives considered**: `xhtml2pdf` (hard to style), `pdfkit` (imperative styling, high effort for "Clean Typography").

### 4. Communication: FastAPI -> Next.js
- **Decision**: FastAPI will handle the heavy lifting (scrape + AI) and return a structured JSON. Next.js will store the JSON and render the PDF.
- **Rationale**: Separates concerns. Python is better for AI/Scraping ecosystem; TypeScript/React is better for UI/Rendering.

## Best Practices

- **Scraping**: Use `headless=True` and `wait_until="networkidle"` for SPAs. Implement a 30s timeout to prevent hanging.
- **AI Prompting**: Use a single structured prompt that includes the "Extracted Content" and "Constitution Rules".
- **Storage**: Use local file storage (or S3-compatible) for permanent PDF storage as per FR-010.

## Unresolved Issues (Resolved)

- **Large Pages**: Gemini 1.5's large context window handles this. We will send the full cleaned text.
- **Clean Typography**: Solved by using a React-based PDF template rendered via Puppeteer.
