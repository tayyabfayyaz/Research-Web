---

description: "Task list for AI Web Intelligence With PDF Generator implementation"
---

# Tasks: AI Web Intelligence With PDF Generator

**Input**: Design documents from `/specs/001-ai-web-pdf-generator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for Next.js and FastAPI

- [x] T001 Create project structure: `backend/`, `frontend/` directories
- [x] T002 Initialize FastAPI project in `backend/` with `main.py` and `requirements.txt`
- [x] T003 Initialize Next.js project in `frontend/` with TypeScript and Tailwind CSS
- [x] T004 [P] Configure `.env` files for `backend/` (GEMINI_API_KEY) and `frontend/`
- [x] T005 [P] Install `playwright` and `google-generativeai` in `backend/`
- [x] T006 [P] Install `puppeteer-core` and `chrome-aws-lambda` in `frontend/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure for data handling and API communication

- [x] T007 Implement Pydantic models for API request/response in `backend/src/models/schemas.py`
- [x] T008 Setup FastAPI router and basic `/generate` endpoint skeleton in `backend/src/api/routes.py`
- [x] T009 Implement base error handling and logging in `backend/src/api/middleware.py`
- [x] T010 Create common UI components (Header, Footer, Layout) in `frontend/src/components/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Research Document Generation (Priority: P1) 🎯 MVP

**Goal**: Generate a structured PDF from a valid URL

**Independent Test**: Submit a Wikipedia URL and receive a 6-section PDF download link

- [x] T011 [P] [US1] Implement Playwright scraper service in `backend/src/services/scraper.py`
- [x] T012 [P] [US1] Implement Gemini AI service with Constitution prompting in `backend/src/services/ai_service.py`
- [x] T013 [US1] Implement PDF generation logic using Puppeteer in `frontend/src/pages/api/export-pdf.ts`
- [x] T014 [US1] Create React-based PDF template in `frontend/src/pages/export-pdf-template.tsx`
- [x] T015 [US1] Integrate scraper and AI services into `/generate` endpoint in `backend/src/api/routes.py`
- [x] T016 [US1] Create main research input form in `frontend/src/pages/index.tsx`
- [x] T017 [US1] Implement download link functionality in `frontend/src/services/api_client.ts`

**Checkpoint**: MVP Ready - User can generate and download a research PDF

---

## Phase 4: User Story 2 - Input Validation & Error Handling (Priority: P2)

**Goal**: Validate URL and domain reachability with user-friendly errors

**Independent Test**: Submit "invalid-url" and see "Proper Format" error; submit non-existent domain and see "Reachable domain" error

- [x] T018 [P] [US2] Implement URL format validation using `pydantic` in `backend/src/models/schemas.py`
- [x] T019 [P] [US2] Implement domain reachability check in `backend/src/services/scraper.py`
- [x] T020 [US2] Update frontend to display validation errors in `frontend/src/pages/index.tsx`
- [x] T021 [US2] Implement timeout handling for scraper and AI services in `backend/src/api/routes.py`

**Checkpoint**: System is stable and handles invalid inputs gracefully

---

## Phase 5: User Story 3 - Dynamic Content Extraction (Priority: P2)

**Goal**: Handle modern SPAs and clean non-content elements

**Independent Test**: Submit a React-based landing page and verify "Extracted Content" has no ads or nav links

- [x] T022 [P] [US3] Configure Playwright to wait for `networkidle` in `backend/src/services/scraper.py`
- [x] T023 [US3] Implement content cleaning logic (remove scripts, ads, nav) in `backend/src/services/scraper.py`
- [x] T024 [US3] Add metadata extraction (title, description) to scraper in `backend/src/services/scraper.py`

**Checkpoint**: Extraction is high-quality for modern, dynamic websites

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T025 [P] Update `quickstart.md` with final environment variables
- [x] T026 Implement permanent storage logic for PDFs in `backend/src/services/storage.py`
- [x] T027 Add loading progress states (Scraping... Analyzing...) to frontend in `frontend/src/pages/index.tsx`
- [x] T028 Final run of validation against success criteria in `spec.md`

---

## Phase 7: Advanced Persistence & History (Priority: P2)

**Goal**: Enable true archival and historical lookup for research tasks

- [x] T029 [P] Implement SQLite/SQLAlchemy persistence layer in `backend/src/models/database.py`
- [x] T030 [P] Create `db_service.py` for async CRUD operations on research tasks
- [x] T031 Update `/generate`, `/status` and `/download` to use the database in `backend/src/api/routes.py`
- [x] T032 Implement `GET /api/tasks` endpoint for historical lookup
- [x] T033 Implement "Recent Research" dashboard on the home page in `frontend/src/pages/index.tsx`
- [x] T034 Add "Re-view Analysis" functionality to dashboard for historical tasks

**Checkpoint**: Project is 100% complete with full persistence and archival history.

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1**: No dependencies.
- **Phase 2**: Depends on Phase 1.
- **Phase 3 (US1)**: Depends on Phase 2. This is the **MVP**.
- **Phase 4 (US2)** & **Phase 5 (US3)**: Can run in parallel after Phase 3 is stable.

### Parallel Opportunities
- T004, T005, T006 can be done in parallel.
- T011 and T012 can be done in parallel.
- US2 and US3 tasks marked [P] can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)
1. Complete Setup (Phase 1).
2. Complete Foundational (Phase 2).
3. Complete US1 (Phase 3).
4. **VALIDATE**: Generate a PDF from a Wikipedia link.

### Incremental Delivery
- Add Phase 4 (Validation) to improve reliability.
- Add Phase 5 (Dynamic Extraction) to improve coverage.
- Final Polish for production readiness.
