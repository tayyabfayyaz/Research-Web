# ADR-002: Backend-Driven Persistent PDF Storage

- **Status:** Accepted
- **Date:** 2026-05-08
- **Feature:** 001-ai-web-pdf-generator
- **Context:** FR-010 requires permanent storage of generated PDFs. The initial design used on-the-fly generation in the frontend (Next.js/Puppeteer), which meant PDFs were never stored on the server and required client-side resources for every download.

## Decision

We have centralized PDF generation and storage on the backend (FastAPI).

Components:
- **PDF Service**: A new backend service using Playwright (Chromium) to capture the frontend's React-based research template.
- **Persistent Storage**: PDFs are saved to a `reports/` directory on the server immediately after AI analysis.
- **Workflow**: Added a `GENERATING` state to the research task lifecycle.
- **Delivery**: The frontend "Download" button now links to a dedicated backend `/download/{task_id}` endpoint that serves the file via FastAPI `FileResponse`.

## Consequences

### Positive
- **Durability**: PDFs are archived permanently on the server, satisfying FR-010.
- **Reliability**: Generation happens in a controlled server environment, reducing client-side failures.
- **Centralized Logic**: The server now manages the entire research lifecycle from URL input to final file availability.

### Negative
- **Server Load**: PDF generation is CPU/Memory intensive on the backend.
- **Coordination**: Requires the backend to have network access to the frontend's template route.

## Alternatives Considered

- **Frontend-only generation**: Rejected as it failed the permanent storage requirement.
- **Direct PDF Libraries (ReportLab/PDFKit)**: Rejected in favor of maintaining the high-quality React/Tailwind template which offers superior typography and layout control.

## References

- Feature Spec: [specs/001-ai-web-pdf-generator/spec.md](specs/001-ai-web-pdf-generator/spec.md)
- PHR: 010-implement-persistent-pdf-storage-and-ui-polish.green.prompt.md
