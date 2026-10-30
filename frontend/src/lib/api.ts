import { Progress, ResearchDocument } from './report';

export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type TaskStatus =
  | 'PENDING' | 'SCRAPING' | 'ANALYZING' | 'VERIFYING' | 'CURATING'
  | 'WRITING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface ResearchTask {
  id: string;
  url: string;
  status: TaskStatus;
  document: ResearchDocument | null;
  progress: Progress | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const isFinished = (status: TaskStatus) => status === 'COMPLETED' || status === 'FAILED';

export const downloadUrl = (id: string) => `${API_URL}/api/download/${id}`;

// fetch() rejects with a bare "Failed to fetch" when the server is down or unreachable
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(
      "Can't reach the research server. It may be starting up (this can take up to a minute) - please try again shortly."
    );
  }
}

async function errorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  // FastAPI validation errors arrive as {detail: [{msg}]}, other errors as {detail: string}
  const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail;
  return detail || fallback;
}

export async function startResearch(url: string): Promise<ResearchTask> {
  const res = await apiFetch(`/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not start the research run'));
  return res.json();
}

export async function getTask(id: string): Promise<ResearchTask> {
  const res = await apiFetch(`/api/status/${id}`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Report not found' : 'Could not load the report');
  return res.json();
}

export async function listTasks(): Promise<ResearchTask[]> {
  const res = await apiFetch(`/api/tasks`);
  if (!res.ok) throw new Error('Could not load recent reports');
  return res.json();
}

export async function askAboutReport(
  id: string,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const res = await apiFetch(`/api/chat/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'The assistant could not answer'));
  return (await res.json()).answer;
}
