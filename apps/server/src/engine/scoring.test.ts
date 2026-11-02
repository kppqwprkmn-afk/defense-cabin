import { describe, expect, it } from 'vitest';
import { analyzeMaterial } from '../domain/analyze.js';
import { buildScript } from './script.js';
import { buildReport } from './scoring.js';
import type { Turn } from '@cabin/shared';

const TEXT = `# 示例项目
## 一、背景
实验室安全检查依赖人工，一次巡检需要 2 至 3 人。

## 二、方案
本项目提出多模态隐患识别框架，在 12 类隐患上准确率达到 92.4%。
平台采用边缘盒部署，单间成本约 1800 元。

## 三、数据
2025 年 9 月，团队在 3 所高校、47 间实验室试点，响应时间由 42 分钟缩短至 11 分钟。

## 四、推广
系统已在某高校试运行，预计每年减少事故 60%。
`;

function makeTurns(text: string): Turn[] {
  const { claims } = analyzeMaterial(text);
  return claims.map((c, i) => ({
    id: `t${i + 1}`,
    round: (i % 5) + 1,
    persona: 'method',
    kind: 'question',
    text: c.text,
    citations: [],
    claimId: c.id,
    theme: c.issues[0],
    risk: i < 3 ? 'high' : undefined,
    createdAt: new Date().toISOString(),
  }));
}

describe('report scoring', () => {
  const project = (() => {
    const { claims, health, chunks } = analyzeMaterial(TEXT);
    return {
      id: 'p1',
      name: '示例项目',
      track: '大创项目',
      team: '测试团队',
      summary: '',
      materialNames: ['a.md'],
      text: TEXT,
      chunks,
      claims,
      health,
      createdAt: new Date().toISOString(),
    };
  })();

  it('deduplicates risks by title and keeps scores in a defensible range', () => {
    const turns = makeTurns(TEXT);
    const report = buildReport(project, buildScript(project, '标准'), turns);
    const titles = report.risks.map((r) => r.title);
    expect(new Set(titles).size).toBe(titles.length);
    expect(report.revisions.length).toBeGreaterThan(0);
    expect(report.overall).toBeGreaterThanOrEqual(50);
    expect(report.overall).toBeLessThanOrEqual(90);
    for (const s of report.scores) {
      expect(s.score).toBeGreaterThanOrEqual(48);
      expect(s.score).toBeLessThanOrEqual(93);
    }
  });

  it('produces a 20+ turn script with a promise challenge', () => {
    const script = buildScript(project, '高压');
    expect(script.length).toBeGreaterThanOrEqual(20);
    expect(script.some((t) => t.theme === 'promise')).toBe(true);
    expect(script.some((t) => t.theme === 'reproducibility')).toBe(true);
  });
});
