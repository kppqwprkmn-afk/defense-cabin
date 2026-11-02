import type { Project, Session, SessionMeta, StreamEvent } from '@cabin/shared';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `请求失败（${res.status}）`;
    throw new Error(message);
  }
  return data as T;
}

export interface Stats {
  projectCount: number;
  sessionCount: number;
  completedCount: number;
  riskCount: number;
  avgScore: number;
}

export interface SessionBundle {
  session: Session;
  project: Project;
}

export interface ProjectSummary {
  id: string;
  name: string;
  track: string;
  createdAt: string;
  claimCount: number;
  health: Project['health'];
}

export const api = {
  stats: () => request<Stats>('/api/stats'),
  projects: () => request<ProjectSummary[]>('/api/projects'),
  sessions: () => request<SessionMeta[]>('/api/sessions'),
  session: (id: string) => request<SessionBundle>(`/api/sessions/${id}`),
  createDemo: (intensity: '标准' | '高压' = '标准', speed = 1.6) =>
    request<{ projectId: string; sessionId: string }>('/api/demo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intensity, speed, autoStart: false }),
    }),
  createProject: (form: FormData) =>
    request<Project>('/api/projects', {
      method: 'POST',
      body: form,
    }),
  createSession: (projectId: string, intensity: '标准' | '高压', speed = 1.6) =>
    request<Session>('/api/sessions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, intensity, speed }),
    }),
  start: (id: string, speed = 1.6) =>
    request<{ ok: boolean }>(`/api/sessions/${id}/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ speed }),
    }),
};

export function connectStream(
  id: string,
  onEvent: (event: StreamEvent) => void,
  onError?: () => void,
): EventSource {
  const es = new EventSource(`/api/sessions/${id}/events`);
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data) as StreamEvent);
    } catch {
      /* ignore malformed */
    }
  };
  es.onerror = () => {
    onError?.();
  };
  return es;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p(d.getHours())}:${p(d.getMinutes())}`;
}
