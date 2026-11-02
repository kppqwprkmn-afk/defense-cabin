import fs from 'node:fs';
import path from 'node:path';
import type { Project } from '@cabin/shared';
import { config } from '../config.js';
import { store } from '../store.js';
import { buildProject } from './analyze.js';

const SAMPLE_FILE = path.join(config.dataDir, '..', '..', '..', 'samples', '智巡校园-实验室安全巡检智能体.md');
const ALT_SAMPLE = path.resolve(config.webDist, '../../../samples/智巡校园-实验室安全巡检智能体.md');

export function sampleText(): string {
  for (const p of [SAMPLE_FILE, ALT_SAMPLE]) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
    } catch {
      /* try next */
    }
  }
  return `# 示例项目\n\n## 背景\n实验室安全检查依赖人工，效率低。\n\n## 方法\n采用多模态模型识别隐患。\n\n## 数据\n在 3 所高校 47 间实验室试点，准确率达到 92.4%。\n`;
}

export function ensureDemoProject(): Project {
  const existing = store.getProject('p-demo');
  if (existing) return existing;
  const project = buildProject({
    id: 'p-demo',
    name: '智巡校园 · 实验室安全巡检智能体',
    track: '大创项目',
    team: '计算机学院 × 安全工程学院',
    summary: '用多模态模型把实验室安全隐患转成可追踪的整改任务。',
    materialNames: ['智巡校园-项目申报书.md'],
    text: sampleText(),
  });
  store.saveProject(project);
  return project;
}
