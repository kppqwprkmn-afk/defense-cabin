import { describe, expect, it } from 'vitest';
import { analyzeMaterial } from './analyze.js';
import { BM25Index } from './text.js';

const SAMPLE = `# 智巡校园
## 一、项目背景
一次完整巡检需要 2 至 3 人配合，纸质记录回收后再人工录入，闭环周期长。

## 二、技术方案
本项目提出一种“视觉—文本—时序”三模态融合的隐患识别框架，在 12 类隐患上平均识别准确率达到 92.4%。
平台采用端—边—云架构，边缘盒单间部署成本约 1800 元。

## 三、试点与数据
2025 年 9 月至 10 月，团队在 3 所高校、47 间实验室开展为期 6 周的试点，累计发现隐患 213 处，平均响应时间由 42 分钟缩短至 11 分钟。
与传统人工巡检相比，单间实验室巡检耗时从 25 分钟降至 6 分钟，效率提升约 4 倍。

## 四、应用与推广
系统已在某高校保卫处试运行，预计每年可减少实验室安全事故 60% 以上。
`;

describe('material analysis', () => {
  it('extracts quantifiable claims and keeps the year prefix', () => {
    const { claims } = analyzeMaterial(SAMPLE);
    expect(claims.length).toBeGreaterThanOrEqual(5);
    const pilot = claims.find((c) => c.text.includes('2025 年'));
    expect(pilot).toBeTruthy();
    expect(pilot?.text.startsWith('2025')).toBe(true);
  });

  it('flags missing baseline and retains the innovation claim', () => {
    const { claims } = analyzeMaterial(SAMPLE);
    const innovation = claims.find((c) => c.text.includes('92.4%'));
    expect(innovation).toBeTruthy();
    expect(innovation?.issues).toContain('no_baseline');
  });

  it('always keeps at least one promise claim for cross-examination', () => {
    const { claims } = analyzeMaterial(SAMPLE);
    expect(claims.some((c) => c.issues.includes('promise'))).toBe(true);
  });

  it('reports coverage and a bounded health score', () => {
    const { health } = analyzeMaterial(SAMPLE);
    expect(health.score).toBeGreaterThan(30);
    expect(health.score).toBeLessThanOrEqual(94);
    expect(health.coverage.length).toBe(8);
    expect(health.chunkCount).toBeGreaterThan(0);
  });
});

describe('BM25 retrieval', () => {
  it('ranks the chunk that contains the query terms first', () => {
    const { chunks } = analyzeMaterial(SAMPLE);
    const index = new BM25Index(chunks);
    const hits = index.search('试点 实验室 响应时间', 2);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].chunk.text).toContain('47 间实验室');
  });
});
