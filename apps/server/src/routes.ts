import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import mammoth from 'mammoth';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { Project, Session, SessionMeta, StreamEvent } from '@cabin/shared';
import { PERSONAS, TRACKS } from '@cabin/shared';
import { config } from './config.js';
import { store } from './store.js';
import { buildProject } from './domain/analyze.js';
import { ensureDemoProject } from './domain/sample.js';
import { normalizeText } from './domain/text.js';
import { isActive, replayEvents, startSession, subscribe } from './engine/orchestrator.js';
import { sessionMarkdown } from './report.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse') as (buffer: Buffer) => Promise<{ text: string }>;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 6 },
});

const projectSchema = z.object({
  name: z.string().trim().min(2, '项目名称至少 2 个字').max(80),
  track: z.string().trim().max(30).default('大创项目'),
  team: z.string().trim().max(80).optional().default('未填写'),
  summary: z.string().trim().max(300).optional().default(''),
});

const sessionSchema = z.object({
  projectId: z.string().min(1),
  intensity: z.enum(['标准', '高压']).default('标准'),
  speed: z.number().min(0.6).max(4).optional(),
});

async function extractFile(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === '.txt' || ext === '.md' || ext === '.markdown') {
    return file.buffer.toString('utf8');
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }
  if (ext === '.pdf') {
    const result = await pdfParse(file.buffer);
    return result.text;
  }
  throw new Error(`不支持的文件格式：${ext || '未知'}，请上传 PDF / DOCX / Markdown / TXT`);
}

function makeSession(project: Project, intensity: '标准' | '高压', speed: number): Session {
  const now = new Date().toISOString();
  return {
    id: `s-${nanoid(8)}`,
    projectId: project.id,
    projectName: project.name,
    track: project.track,
    status: 'ready',
    mode: config.aiMode === 'openai' ? 'llm' : 'mock',
    intensity,
    turns: [],
    scores: [],
    risks: [],
    revisions: [],
    summary: '',
    overall: 0,
    progress: 0,
    createdAt: now,
    speed,
  };
}

function toMeta(s: Session): SessionMeta {
  return {
    id: s.id,
    projectName: s.projectName,
    track: s.track,
    status: s.status,
    overall: s.overall,
    createdAt: s.createdAt,
    turnCount: s.turns.length,
    topRisk: s.risks[0]?.title ?? '待演练',
  };
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, mode: config.aiMode, time: new Date().toISOString() });
  });

  app.get('/api/meta', (_req, res) => {
    res.json({
      personas: PERSONAS,
      tracks: TRACKS,
      mode: config.aiMode,
      version: '1.0.0',
    });
  });

  app.get('/api/stats', (_req, res) => {
    res.json(store.stats());
  });

  app.get('/api/projects', (_req, res) => {
    res.json(
      store.listProjects().map((p) => ({
        id: p.id,
        name: p.name,
        track: p.track,
        createdAt: p.createdAt,
        claimCount: p.claims.length,
        health: p.health,
      })),
    );
  });

  app.get('/api/projects/:id', (req, res) => {
    const project = store.getProject(req.params.id);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    return res.json(project);
  });

  app.delete('/api/projects/:id', (req, res) => {
    store.deleteProject(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/projects', upload.array('files', 6), async (req: Request, res: Response) => {
    try {
      const files = (req.files as Express.Multer.File[] | undefined) ?? [];
      if (!files.length) return res.status(400).json({ error: '请至少上传一份项目材料' });

      const parsed = projectSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '参数不合法' });
      }
      const meta = parsed.data;
      const texts: string[] = [];
      for (const file of files) {
        const raw = await extractFile(file);
        const clean = normalizeText(raw);
        if (clean.length < 40) continue;
        texts.push(`# 附件：${file.originalname}\n\n${clean}`);
      }
      const text = texts.join('\n\n');
      if (text.length < 120) {
        return res.status(400).json({ error: '材料可读文字太少，建议上传含文字的 PDF/DOCX 或 Markdown' });
      }

      const project = buildProject({
        id: `p-${nanoid(8)}`,
        name: meta.name,
        track: meta.track,
        team: meta.team || '未填写',
        summary: meta.summary || text.slice(0, 120).replace(/\s+/g, ' '),
        materialNames: files.map((f) => f.originalname),
        text,
      });
      store.saveProject(project);
      return res.status(201).json(project);
    } catch (err) {
      const message = err instanceof Error ? err.message : '材料解析失败';
      return res.status(400).json({ error: message });
    }
  });

  app.post('/api/sessions', (req, res) => {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? '参数不合法' });
    }
    const project = store.getProject(parsed.data.projectId);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const session = makeSession(project, parsed.data.intensity, parsed.data.speed ?? config.demoSpeed);
    store.saveSession(session);
    return res.status(201).json(session);
  });

  app.get('/api/sessions', (_req, res) => {
    res.json(store.listSessions().map(toMeta));
  });

  app.get('/api/sessions/:id', (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: '演练不存在' });
    const project = store.getProject(session.projectId);
    return res.json({ session, project });
  });

  app.post('/api/sessions/:id/start', (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: '演练不存在' });
    const speed = Number(req.body?.speed ?? session.speed ?? 1);
    const result = startSession(session.id, Number.isFinite(speed) ? speed : 1);
    if (!result.started) {
      return res.status(409).json({ error: result.reason ?? '无法开始', running: isActive(session.id) });
    }
    return res.json({ ok: true });
  });

  app.get('/api/sessions/:id/report.md', (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: '演练不存在' });
    const project = store.getProject(session.projectId);
    if (!project) return res.status(404).json({ error: '项目不存在' });
    const md = sessionMarkdown(project, session);
    const filename = encodeURIComponent(`答辩预演报告-${project.name.slice(0, 20)}.md`);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    return res.send(md);
  });

  app.get('/api/sessions/:id/events', (req, res) => {
    const session = store.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: '演练不存在' });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    req.socket.setTimeout(0);

    let closed = false;
    const send = (event: StreamEvent) => {
      if (closed || res.writableEnded) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = subscribe(session.id, send);
    for (const event of replayEvents(session)) send(event);

    const heartbeat = setInterval(() => {
      if (!closed && !res.writableEnded) res.write(': ping\n\n');
    }, 15000);

    const cleanup = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      unsubscribe();
    };
    req.on('close', cleanup);
    req.on('error', cleanup);
    return undefined;
  });

  app.post('/api/demo', (req, res) => {
    const project = ensureDemoProject();
    const intensity = req.body?.intensity === '高压' ? '高压' : '标准';
    const session = makeSession(project, intensity, Number(req.body?.speed) || 1.6);
    store.saveSession(session);
    if (req.body?.autoStart !== false) startSession(session.id, session.speed);
    res.status(201).json({ projectId: project.id, sessionId: session.id });
  });

  if (fs.existsSync(config.webDist)) {
    app.use(express.static(config.webDist, { index: false }));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(config.webDist, 'index.html'));
    });
  }

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('[api] error', err);
    if (res.headersSent) return;
    res.status(500).json({ error: '服务内部错误' });
  });

  return app;
}
