import type { Citation, Project, Session, StreamEvent, Turn } from '@cabin/shared';
import { PERSONAS } from '@cabin/shared';
import { config } from '../config.js';
import { store } from '../store.js';
import { BM25Index, clip } from '../domain/text.js';
import { buildScript, type PlannedTurn } from './script.js';
import { buildReport } from './scoring.js';
import { llmComplete } from './llm.js';

const listeners = new Map<string, Set<(event: StreamEvent) => void>>();
const active = new Set<string>();

export function subscribe(sessionId: string, fn: (event: StreamEvent) => void): () => void {
  let set = listeners.get(sessionId);
  if (!set) {
    set = new Set();
    listeners.set(sessionId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) listeners.delete(sessionId);
  };
}

function emit(sessionId: string, event: StreamEvent) {
  const set = listeners.get(sessionId);
  if (!set) return;
  for (const fn of set) {
    try {
      fn(event);
    } catch {
      /* client disconnected */
    }
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

function citationsFor(project: Project, index: BM25Index, text: string, claimId?: string): Citation[] {
  const claim = project.claims.find((c) => c.id === claimId);
  const query = `${claim?.text ?? ''} ${text}`.slice(0, 400);
  const hits = index.search(query, 2);
  const list = hits.length
    ? hits
    : claim
      ? [{ chunk: project.chunks.find((c) => c.id === claim.chunkId) ?? project.chunks[0], score: 1 }]
      : [];
  return list
    .filter((h) => h.chunk)
    .map((h) => ({
      chunkId: h.chunk.id,
      section: h.chunk.section,
      snippet: clip(h.chunk.text, 96),
      score: Math.round(h.score * 100) / 100,
    }));
}

async function refinedText(project: Project, plan: PlannedTurn, history: Turn[]): Promise<string> {
  if (config.aiMode !== 'openai' || !config.openai.apiKey) return plan.text;
  if (plan.kind === 'system' || plan.kind === 'summary' || plan.kind === 'opening') return plan.text;
  const persona = PERSONAS[plan.persona];
  const claim = project.claims.find((c) => c.id === plan.claimId);
  const recent = history
    .slice(-4)
    .map((t) => `${PERSONAS[t.persona].name}：${t.text}`)
    .join('\n');
  const system = `你在扮演高校答辩模拟评审「${persona.name}·${persona.title}」。说话锋利、具体、只说一件事，不堆术语，不重复材料原句。只输出一段中文台词，80-120 字，不要加姓名前缀，不要解释。`;
  const user = `项目：${project.name}\n论点：${claim?.text ?? '（无）'}\n最近对话：\n${recent || '（刚开始）'}\n\n请按原计划的意思，用你的口吻说：${plan.text}`;
  const result = await llmComplete(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    220,
  );
  if (!result) return plan.text;
  return result.replace(/^[^：:]{1,8}[：:]\s*/, '').slice(0, 240);
}

async function run(sessionId: string) {
  const session = store.getSession(sessionId);
  if (!session) return;
  const project = store.getProject(session.projectId);
  if (!project) {
    session.status = 'ready';
    store.saveSession(session);
    emit(sessionId, { type: 'error', message: '项目材料不存在' });
    return;
  }

  const planned = buildScript(project, session.intensity);
  const index = new BM25Index(project.chunks);
  const speed = Math.max(0.6, Math.min(4, session.speed || 1));
  let report: ReturnType<typeof buildReport> | undefined;
  let n = 0;

  for (const plan of planned) {
    const live = store.getSession(sessionId);
    if (!live) return;

    let text = plan.text;
    if (plan.kind === 'summary') {
      report = buildReport(project, planned, live.turns);
      text = report.summary;
    } else {
      text = await refinedText(project, plan, live.turns);
    }

    const turn: Turn = {
      id: `t${++n}`,
      round: plan.round,
      persona: plan.persona,
      kind: plan.kind,
      text: '',
      citations: citationsFor(project, index, text, plan.claimId),
      claimId: plan.claimId,
      target: plan.target,
      theme: plan.theme,
      risk: plan.risk,
      createdAt: new Date().toISOString(),
    };

    emit(sessionId, { type: 'turn:start', turn: { ...turn, text: '' } });

    const step = 3;
    for (let i = 0; i < text.length; i += step) {
      if (!store.getSession(sessionId)) return;
      emit(sessionId, { type: 'turn:delta', id: turn.id, delta: text.slice(i, i + step) });
      await sleep(13 / speed);
    }

    turn.text = text;
    live.turns.push(turn);
    live.progress = Math.round(((n + 0.2) / planned.length) * 100);
    store.saveSession(live);
    emit(sessionId, { type: 'turn:end', turn });
    emit(sessionId, { type: 'status', status: 'running', progress: live.progress });
    await sleep(240 / speed);
  }

  report ??= buildReport(project, planned, session.turns);
  const final = store.getSession(sessionId);
  if (!final) return;
  final.scores = report.scores;
  final.risks = report.risks;
  final.revisions = report.revisions;
  final.summary = report.summary;
  final.overall = report.overall;
  final.status = 'completed';
  final.progress = 100;
  final.completedAt = new Date().toISOString();
  store.saveSession(final);

  emit(sessionId, { type: 'status', status: 'completed', progress: 100 });
  emit(sessionId, {
    type: 'report',
    scores: report.scores,
    risks: report.risks,
    revisions: report.revisions,
    summary: report.summary,
    overall: report.overall,
  });
  emit(sessionId, { type: 'done' });
}

export function startSession(sessionId: string, speed = 1): { started: boolean; reason?: string } {
  const session = store.getSession(sessionId);
  if (!session) return { started: false, reason: 'not_found' };
  if (session.status === 'completed') return { started: false, reason: 'already_completed' };
  if (active.has(sessionId)) return { started: false, reason: 'already_running' };

  active.add(sessionId);
  session.status = 'running';
  session.progress = 0;
  session.speed = speed;
  session.turns = [];
  session.scores = [];
  session.risks = [];
  session.revisions = [];
  session.overall = 0;
  session.summary = '';
  store.saveSession(session);
  emit(sessionId, { type: 'status', status: 'running', progress: 0 });

  void run(sessionId)
    .catch((err) => {
      console.error('[orchestrator] run failed', err);
      const s = store.getSession(sessionId);
      if (s) {
        s.status = 'ready';
        store.saveSession(s);
      }
      emit(sessionId, { type: 'error', message: '质询执行异常，请重试' });
    })
    .finally(() => active.delete(sessionId));

  return { started: true };
}

export function isActive(sessionId: string): boolean {
  return active.has(sessionId);
}

export function replayEvents(session: Session): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (const turn of session.turns) events.push({ type: 'turn:end', turn });
  events.push({ type: 'status', status: session.status, progress: session.progress });
  if (session.status === 'completed') {
    events.push({
      type: 'report',
      scores: session.scores,
      risks: session.risks,
      revisions: session.revisions,
      summary: session.summary,
      overall: session.overall,
    });
    events.push({ type: 'done' });
  }
  return events;
}
