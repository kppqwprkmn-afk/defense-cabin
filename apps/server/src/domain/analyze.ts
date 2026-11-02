import type { Claim, ClaimKind, CoverageItem, IssueCode, MaterialHealth, Project } from '@cabin/shared';
import { chunkText, clip, normalizeText, sentences, splitSections, type Section } from './text.js';

const KIND_MARKERS: { kind: ClaimKind; re: RegExp; weight: number }[] = [
  { kind: '创新', re: /提出|创新(?!创业)|首次|自研|首创|突破|融合框架|新范式/, weight: 10 },
  { kind: '方法', re: /采用|基于|通过|架构|算法|模型|框架|设计了|构建了/, weight: 6 },
  { kind: '数据', re: /\d+(\.\d+)?\s*%|准确率|召回率|提升了|降低了|缩短了|倍|样本|试点|专利|软著|立项|获奖/, weight: 6 },
  { kind: '应用', re: /平台|系统|场景|用户|落地|推广|部署|客户/, weight: 4 },
  { kind: '团队', re: /团队|成员|分工|指导教师|负责人/, weight: 2 },
  { kind: '承诺', re: /预计|有望|将|计划|目标|未来/, weight: 1 },
];

const BUZZWORDS = ['赋能', '闭环', '生态', '颠覆', '领先', '智能化', '数字化转型', '大模型', '多模态', '全链路'];

function classify(sentence: string): ClaimKind {
  // “本项目提出……框架”是创新点的主干句，不能被句子里的百分比抢走分类。
  if (/(本项目|我们|团队)?提出.{0,40}(框架|方法|机制|范式|系统)/.test(sentence)) return '创新';
  let best: ClaimKind = '方法';
  let bestScore = 0;
  for (const m of KIND_MARKERS) {
    const hits = sentence.match(new RegExp(m.re.source, 'g'))?.length ?? 0;
    const score = hits * m.weight;
    if (score > bestScore) {
      bestScore = score;
      best = m.kind;
    }
  }
  return best;
}

export function detectIssues(sentence: string): IssueCode[] {
  const issues = new Set<IssueCode>();
  const hasNumber = /\d/.test(sentence);
  const hasSampleSize = /\d+(\.\d+)?\s*(份|间|人|例|个|所|次|组|条|台|名|校|周|天|月|小时|分钟)/.test(
    sentence,
  );
  const hasBaseline = /相比|对比|基线|对照组|上一版|传统|人工|原有|benchmark/i.test(sentence);
  const isMetric = /准确率|召回率|F1|提升|降低|缩短|优于|高于|达到|效率/.test(sentence);
  const isComparison = /提升|降低|缩短|优于|高于|下降|减少/.test(sentence);

  if (isMetric && !hasBaseline) issues.add('no_baseline');
  if (hasNumber && !hasSampleSize && /%|倍|准确率|召回率|F1/.test(sentence)) issues.add('no_sample');
  if (isComparison && /由|从/.test(sentence) && !/主要|归因|贡献|消融/.test(sentence)) issues.add('causal');
  if (/预计|有望|未来|计划|目标|将实现/.test(sentence) && hasNumber) issues.add('promise');
  if (/显著|大幅|有效|较好|一定程度|明显/.test(sentence)) issues.add('vague');
  if (hasNumber && !/试点|测试|实验|统计|调研|问卷|日志|记录|样本|数据集|来源/.test(sentence))
    issues.add('no_source');
  if (/专利|软著|著作权/.test(sentence) && !/受理|授权|登记号|证书|已登记/.test(sentence))
    issues.add('no_source');
  const buzzCount = BUZZWORDS.filter((w) => sentence.includes(w)).length;
  if (buzzCount >= 3) issues.add('buzzword');
  return [...issues];
}

function strengthOf(sentence: string, issues: IssueCode[]): { strength: Claim['strength']; score: number } {
  let score = 48;
  if (/\d/.test(sentence)) score += 10;
  if (/\d+(\.\d+)?\s*(份|间|人|例|个|所|次|组|条|台|名|校|项|套|篇|元|万元|分钟|小时|周|月|年)/.test(sentence))
    score += 13;
  if (/相比|对比|基线|对照组|传统|人工/.test(sentence)) score += 10;
  if (/提出|首次|自研|创新/.test(sentence)) score += 6;
  if (/提出.{0,40}(框架|方法|机制|范式|系统)/.test(sentence)) score += 14;
  if (/首次/.test(sentence)) score += 8;
  if (/准确率|召回率|F1|p\s*<|置信区间/.test(sentence)) score += 4;
  if (/达到|提升至|降低至/.test(sentence)) score += 2;
  if (issues.includes('promise')) score -= 14;
  if (issues.includes('vague')) score -= 8;
  if (issues.includes('buzzword')) score -= 7;
  if (issues.includes('no_baseline')) score -= 7;
  if (issues.includes('no_sample')) score -= 5;
  if (issues.includes('no_source')) score -= 4;
  score = Math.max(30, Math.min(94, score));
  return { strength: score >= 78 ? 'strong' : score >= 60 ? 'medium' : 'weak', score };
}

function dedupeKey(text: string) {
  return text.replace(/[^\u4e00-\u9fffa-z0-9]/gi, '').slice(0, 26);
}

export function extractClaims(sections: Section[], chunks: { id: string; section: string; text: string }[]): Claim[] {
  const candidates: (Claim & { rank: number })[] = [];
  const seen = new Set<string>();
  let n = 0;

  for (const section of sections) {
    const chunk = chunks.find((c) => c.section === section.title) ?? chunks[0];
    for (const sentence of sentences(section.body)) {
      const text = sentence.replace(/^[（(]?\d{1,2}[）)]?[、.]\s*/, '').trim();
      if (text.length < 16) continue;
      const issues = detectIssues(text);
      const kind = classify(text);
      const { strength, score } = strengthOf(text, issues);
      const key = dedupeKey(text);
      if (seen.has(key)) continue;
      seen.add(key);

      const kindBonus = kind === '创新' ? 9 : kind === '数据' ? 10 : kind === '方法' ? 6 : kind === '承诺' ? 3 : 1;
      const sectionBonus = /背景|问题定义|现状|痛点/.test(section.title)
        ? -16
        : /创新|方案|技术|数据|试点|成果|实验/.test(section.title)
          ? 9
          : 0;
      const issuePenalty = issues.filter((i) => i !== 'none').length * 2;
      const rank = score + kindBonus + sectionBonus - issuePenalty + (text.length > 30 ? 3 : 0);
      if (score < 38 && kind !== '承诺') continue;

      candidates.push({
        id: `a${++n}`,
        text,
        kind,
        strength,
        issues: issues.length ? issues : ['none'],
        section: section.title,
        chunkId: chunk?.id ?? 'c1',
        score,
        evidence: clip(chunk?.text ?? text, 160),
        rank,
      });
    }
  }

  const selected: Claim[] = [];
  const usedKinds = new Map<ClaimKind, number>();
  for (const c of candidates.sort((a, b) => b.rank - a.rank)) {
    const used = usedKinds.get(c.kind) ?? 0;
    if (used >= 4) continue;
    if (selected.some((s) => s.text.slice(0, 14) === c.text.slice(0, 14))) continue;
    selected.push(c);
    usedKinds.set(c.kind, used + 1);
    if (selected.length >= 11) break;
  }

  // 承诺性表述必须进入质询清单——它是最容易被评委击穿、也最容易被选手忽略的一类句子。
  if (!selected.some((c) => c.issues.includes('promise')) && selected.length < 12) {
    const promise = [...candidates]
      .filter((c) => c.issues.includes('promise') && !selected.some((s) => s.id === c.id))
      .sort(
        (a, b) =>
          Number(b.text.includes('%')) - Number(a.text.includes('%')) || b.rank - a.rank,
      )[0];
    if (promise) selected.push(promise);
  }
  return selected;
}

const COVERAGE: { key: string; label: string; hints: string[]; need: RegExp }[] = [
  { key: 'background', label: '问题与背景', hints: ['背景', '问题', '痛点', '现状'], need: /痛点|问题|现状|需求/ },
  { key: 'method', label: '方法与架构', hints: ['方案', '方法', '技术', '架构', '实现'], need: /架构|算法|模型|流程|技术路线/ },
  { key: 'innovation', label: '创新点', hints: ['创新', '特色', '突破'], need: /创新|首次|自研|区别/ },
  { key: 'data', label: '实验与数据', hints: ['数据', '实验', '试点', '测试', '结果'], need: /\d+(\.\d+)?\s*%|\d+\s*(间|份|人|例|次)/ },
  { key: 'application', label: '应用与推广', hints: ['应用', '推广', '落地', '场景'], need: /应用|推广|落地|部署/ },
  { key: 'team', label: '团队与分工', hints: ['团队', '分工', '成员'], need: /团队|成员|分工/ },
  { key: 'risk', label: '风险与合规', hints: ['风险', '伦理', '合规', '安全'], need: /风险|隐私|伦理|合规|数据安全/ },
  { key: 'proof', label: '成果与佐证', hints: ['成果', '专利', '论文', '获奖', '佐证'], need: /专利|论文|软著|获奖|检测报告/ },
];

export function analyzeMaterial(text: string): {
  sections: Section[];
  chunks: ReturnType<typeof chunkText>;
  claims: Claim[];
  health: MaterialHealth;
} {
  const normalized = normalizeText(text);
  const sections = splitSections(normalized);
  const chunks = chunkText(normalized);
  const claims = extractClaims(sections, chunks);

  const coverage: CoverageItem[] = COVERAGE.map((c) => {
    const sectionHit = sections.some((s) => c.hints.some((h) => s.title.includes(h)));
    const bodyHit = c.need.test(normalized);
    const ok = sectionHit && bodyHit;
    return {
      key: c.key,
      label: c.label,
      ok,
      note: ok ? '已覆盖' : sectionHit ? '有章节但缺关键内容' : '未检测到',
    };
  });

  const strongRatio = claims.length ? claims.filter((c) => c.strength === 'strong').length / claims.length : 0;
  const evidenceDensity = claims.length
    ? claims.filter((c) => /\d/.test(c.text)).length / claims.length
    : 0;
  const issueCount = claims.reduce((n, c) => n + c.issues.filter((i) => i !== 'none').length, 0);
  const coverageScore = (coverage.filter((c) => c.ok).length / coverage.length) * 34;
  const score = Math.round(
    Math.max(38, Math.min(94, 38 + coverageScore + strongRatio * 26 + evidenceDensity * 12 - issueCount * 1.1)),
  );

  const findings: string[] = [];
  const missing = coverage.filter((c) => !c.ok);
  if (missing.length) findings.push(`材料体检发现 ${missing.length} 个评审必看板块不完整：${missing.map((m) => m.label).join('、')}。`);
  const weak = claims.filter((c) => c.strength === 'weak');
  if (weak.length) findings.push(`有 ${weak.length} 条表述属于「弱证据」，在压力质询下最容易失守。`);
  const noBaseline = claims.filter((c) => c.issues.includes('no_baseline'));
  if (noBaseline.length) findings.push(`${noBaseline.length} 条量化结论没有交代基线，评委一定会追问「跟谁比」。`);
  const promises = claims.filter((c) => c.issues.includes('promise'));
  if (promises.length) findings.push(`检测到 ${promises.length} 处承诺性指标，建议改成阶段性目标或补充测算依据。`);
  if (!findings.length) findings.push('材料结构完整、证据密度良好，可直接进入压力质询。');

  return {
    sections,
    chunks,
    claims,
    health: {
      score,
      totalChars: normalized.length,
      chunkCount: chunks.length,
      claimCount: claims.length,
      strongRatio: Math.round(strongRatio * 100),
      evidenceDensity: Math.round(evidenceDensity * 100),
      coverage,
      findings,
    },
  };
}

export function buildProject(input: {
  id: string;
  name: string;
  track: string;
  team: string;
  summary: string;
  materialNames: string[];
  text: string;
}): Project {
  const { claims, health, chunks } = analyzeMaterial(input.text);
  return {
    ...input,
    chunks,
    claims,
    health,
    createdAt: new Date().toISOString(),
  };
}
