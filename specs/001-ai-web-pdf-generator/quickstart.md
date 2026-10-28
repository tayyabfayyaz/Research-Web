# Quickstart: AI Web Intelligence With PDF Generator

## Local Development

### 1. Prerequisites
- Python 3.11+
- Node.js 18+
- Gemini API Key

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

### 3. Frontend Setup (Next.js)
```bash
cd frontend
npm install
```

### 4. Environment Variables

Create `.env` in `backend/`:
```env
GEMINI_API_KEY=your_key_here
FRONTEND_URL=http://localhost:3000
```

Create `.env.local` in `frontend/`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 5. Running the System
1. Start Backend: `cd backend && uvicorn main:app --reload`
2. Start Frontend: `cd frontend && npm run dev`
3. Open `http://localhost:3000`, enter a URL, and wait for the PDF download.

## Verification
- Submit `https://en.wikipedia.org/wiki/Artificial_intelligence`.
- Monitor the dashboard for: `Scraping` -> `Analyzing` -> `Generating`.
- Verify the `History` section shows the new task.
- Check if PDF is generated with all 6 mandatory sections.
- Verify typography and section hierarchy in the downloaded PDF.
