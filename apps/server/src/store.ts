import fs from 'node:fs';
import path from 'node:path';
import type { Project, Session } from '@cabin/shared';
import { config } from './config.js';

interface Database {
  projects: Project[];
  sessions: Session[];
}

const EMPTY: Database = { projects: [], sessions: [] };

class JsonStore {
  private db: Database = structuredClone(EMPTY);
  private file = path.join(config.dataDir, 'db.json');

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.file)) {
        const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<Database>;
        this.db = {
          projects: parsed.projects ?? [],
          sessions: (parsed.sessions ?? []).map((s) =>
            s.status === 'running' ? { ...s, status: 'ready', progress: 0 } : s,
          ),
        };
      }
    } catch (err) {
      console.warn('[store] failed to load db, starting empty:', err);
      this.db = structuredClone(EMPTY);
    }
  }

  private persist() {
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf8');
    fs.renameSync(tmp, this.file);
  }

  listProjects(): Project[] {
    return [...this.db.projects].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getProject(id: string): Project | undefined {
    return this.db.projects.find((p) => p.id === id);
  }

  saveProject(project: Project) {
    const idx = this.db.projects.findIndex((p) => p.id === project.id);
    if (idx >= 0) this.db.projects[idx] = project;
    else this.db.projects.push(project);
    this.persist();
  }

  deleteProject(id: string) {
    this.db.projects = this.db.projects.filter((p) => p.id !== id);
    this.db.sessions = this.db.sessions.filter((s) => s.projectId !== id);
    this.persist();
  }

  listSessions(): Session[] {
    return [...this.db.sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getSession(id: string): Session | undefined {
    return this.db.sessions.find((s) => s.id === id);
  }

  saveSession(session: Session) {
    const idx = this.db.sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) this.db.sessions[idx] = session;
    else this.db.sessions.push(session);
    this.persist();
  }

  stats() {
    const sessions = this.db.sessions.filter((s) => s.status === 'completed');
    const risks = sessions.reduce((n, s) => n + s.risks.length, 0);
    const avg = sessions.length
      ? Math.round(sessions.reduce((n, s) => n + s.overall, 0) / sessions.length)
      : 0;
    return {
      projectCount: this.db.projects.length,
      sessionCount: this.db.sessions.length,
      completedCount: sessions.length,
      riskCount: risks,
      avgScore: avg,
    };
  }
}

export const store = new JsonStore();
