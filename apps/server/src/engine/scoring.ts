import type {
  Claim,
  DimensionScore,
  IssueCode,
  Project,
  Revision,
  RiskItem,
  Turn,
} from '@cabin/shared';
import { clip } from '../domain/text.js';
import type { PlannedTurn } from './script.js';

const DIM_OF: Record<Exclude<IssueCode, 'none'>, string> = {
  no_baseline: '证据强度',
  no_sample: '证据强度',
  causal: '证据强度',
  vague: '表达清晰度',
  promise: '合规与复现',
  no_source: '合规与复现',
  buzzword: '创新性',
};

const TITLE_OF: Record<Exclude<IssueCode, 'none'>, string> = {
  no_baseline: '量化结论缺少基线',
  no_sample: '样本代表性不足',
  causal: '相关性被写成因果',
  vague: '关键表述不可度量',
  promise: '承诺性指标越界',
  no_source: '数据来源不可核验',
  buzzword: '创新点被概念包装',
};

const DETAIL_OF: Record<Exclude<IssueCode, 'none'>, string> = {
  no_baseline: '评审无法判断提升来自方法、数据还是工程堆叠。需补同数据集、同参数量的对照组与置信区间。',
  no_sample: '样本量、抽样方式和场景分布未交代，平均值可能掩盖最难的子场景。需补分层报告。',
  causal: '多个变量同时变化，却把结果单独归因于系统。需补消融或至少把结论降级为相关性描述。',
  vague: '“显著”“有效”没有可核验的阈值，质询时无法自证。需给出具体数值与检验方法。',
  promise: '把目标值写成已实现结论，容易被判定为过度承诺。需改为阶段性目标并补测算依据。',
  no_source: '数字没有原始记录或出处，评委无法复核。需补数据字典、统计口径与附件索引。',
  buzzword: '概念密度高于技术密度，原创贡献边界模糊。需用一句话说清“没有你，别人做不出什么”。',
};

const REVISION_OF: Record<string, { title: string; detail: string; effort: Revision['effort']; gain: number }> = {
  no_baseline: {
    title: '补齐基线对照与置信区间',
    detail: '在同一测试集上补 2 个同参数量基线，报告均值、方差与 95% 置信区间；把“达到”改为“在 X 测试集上取得”。',
    effort: '中',
    gain: 9,
  },
  no_sample: {
    title: '补充样本构成与分层结果',
    detail: '列出 47 间实验室的类型分布，按危化品/电气/消防分层报告召回率；明确抽样偏差与外部效度边界。',
    effort: '低',
    gain: 7,
  },
  causal: {
    title: '做归因拆解或降级结论',
    detail: '补一组未上线实验室的对照，或至少把“缩短 74%”改为“试点期间同期下降”，并列出竞争性解释。',
    effort: '高',
    gain: 6,
  },
  promise: {
    title: '把承诺性指标改为阶段目标',
    detail: '删除“减少事故 60%”，改为“首年目标将重复隐患占比降低 X%”，并给出测算口径与验证节点。',
    effort: '低',
    gain: 5,
  },
  no_source: {
    title: '为每个数字补原始记录',
    detail: '建立“数字—口径—原始记录—附件页码”四列表，确保评委随机抽查任意一个数字都能落到证据。',
    effort: '低',
    gain: 6,
  },
  buzzword: {
    title: '重写一句话原创贡献',
    detail: '用“现有方法做不到 + 我们怎么做 + 可验证差异”三句式重写创新点，删掉无法证伪的形容词。',
    effort: '低',
    gain: 4,
  },
};

const BASE: Record<string, number> = {
  创新性: 79,
  可行性: 76,
  证据强度: 76,
  表达清晰度: 83,
  合规与复现: 77,
};

const WEIGHT: Record<string, number> = {
  创新性: 0.22,
  可行性: 0.22,
  证据强度: 0.26,
  表达清晰度: 0.14,
  合规与复现: 0.16,
};

const PENALTY = { high: 7, medium: 4, low: 2 } as const;

function levelFor(issue: IssueCode, turnRisk?: Turn['risk']): RiskItem['level'] {
  if (turnRisk === 'high') return 'high';
  if (issue === 'no_baseline' || issue === 'no_sample' || issue === 'promise') return 'high';
  if (issue === 'vague' || issue === 'buzzword') return 'low';
  return 'medium';
}

export function buildReport(
  project: Project,
  planned: PlannedTurn[],
  turns: Turn[],
): {
  scores: DimensionScore[];
  risks: RiskItem[];
  revisions: Revision[];
  summary: string;
  overall: number;
} {
  const claimById = new Map(project.claims.map((c) => [c.id, c]));
  const discussed = new Set(turns.map((t) => t.claimId).filter(Boolean) as string[]);
  const focus = project.claims.filter((c) => discussed.has(c.id));
  const pool = focus.length ? focus : project.claims.slice(0, 4);

  const risks: RiskItem[] = [];
  const seen = new Set<string>();
  let rn = 0;

  const addRisk = (claim: Claim, issue: Exclude<IssueCode, 'none'>, turn?: Turn) => {
    const key = `${claim.id}:${issue}`;
    if (seen.has(key) || risks.length >= 8) return;
    if (risks.some((r) => r.title === TITLE_OF[issue])) return;
    seen.add(key);
    const turnRisk = turn?.risk;
    risks.push({
      id: `r${++rn}`,
      dimension: DIM_OF[issue],
      title: TITLE_OF[issue],
      level: levelFor(issue, turnRisk),
      detail: `${clip(claim.text, 72)} —— ${DETAIL_OF[issue]}`,
      claimId: claim.id,
      turnId: turn?.id,
    });
  };

  for (const claim of pool) {
    const issues = claim.issues.filter((i): i is Exclude<IssueCode, 'none'> => i !== 'none');
    for (const issue of issues) {
      const turn = turns.find((t) => t.claimId === claim.id && t.risk);
      addRisk(claim, issue, turn);
    }
  }

  const reproTurn = turns.find((t) => t.theme === 'reproducibility' || t.text.includes('复现'));
  if (reproTurn && !risks.some((r) => r.title.includes('复现'))) {
    risks.push({
      id: `r${++rn}`,
      dimension: '合规与复现',
      title: '复现材料与权重未闭环',
      level: 'high',
      detail: '代码可开源，但模型权重、原始数据与固件受授权限制。评委按 README 只能复现流程，不能复现指标。',
      turnId: reproTurn.id,
    });
  }
  if (risks.length < 4) {
    for (const claim of project.claims) {
      for (const issue of claim.issues) {
        if (issue !== 'none') addRisk(claim, issue);
        if (risks.length >= 5) break;
      }
      if (risks.length >= 5) break;
    }
  }

  const scores: DimensionScore[] = Object.keys(BASE).map((label) => {
    let value = BASE[label] ?? 75;
    let deducted = 0;
    for (const risk of risks.filter((r) => r.dimension === label)) {
      deducted += PENALTY[risk.level];
    }
    value -= Math.min(16, deducted);
    value = Math.round(Math.max(48, Math.min(93, value)));
    const count = risks.filter((r) => r.dimension === label).length;
    return {
      key: label,
      label,
      score: value,
      delta: value - 72,
      note:
        count === 0
          ? '本轮未发现结构性缺口'
          : count === 1
            ? '有 1 处需要在提交前补证'
            : `${count} 处缺口集中在这里，建议优先处理`,
    };
  });

  const overall = Math.round(scores.reduce((sum, s) => sum + s.score * (WEIGHT[s.label] ?? 0.2), 0));

  const highRisks = risks.filter((r) => r.level === 'high');
  const usedRevisions = new Set<string>();
  const revisions: Revision[] = highRisks
    .concat(risks.filter((r) => r.level !== 'high'))
    .slice(0, 8)
    .map((risk, i) => {
      const issue = (Object.keys(TITLE_OF) as Exclude<IssueCode, 'none'>[]).find((k) => TITLE_OF[k] === risk.title);
      const rev = issue ? REVISION_OF[issue] : undefined;
      return {
        id: `v${i + 1}`,
        priority: risk.level === 'high' ? 'P0' : risk.level === 'medium' ? 'P1' : 'P2',
        title: rev?.title ?? (risk.title.includes('复现') ? '补齐复现包与权限说明' : risk.title),
        detail:
          rev?.detail ??
          (risk.title.includes('复现')
            ? '提供脱敏 demo 数据、Docker 镜像与权重申请流程；明确“可复现流程”与“可复现指标”的边界。'
            : risk.detail),
        claimId: risk.claimId,
        effort: rev?.effort ?? '中',
        gain: rev?.gain ?? 5,
      } as Revision;
    })
    .filter((r) => {
      if (usedRevisions.has(r.title)) return false;
      usedRevisions.add(r.title);
      return true;
    })
    .slice(0, 6);

  const best = [...scores].sort((a, b) => b.score - a.score)[0];
  const worst = [...scores].sort((a, b) => a.score - b.score)[0];
  const p0 = revisions.filter((r) => r.priority === 'P0').slice(0, 3);
  const summary = `「${project.name}」本轮综合得分 ${overall}。最强项是${best?.label}（${best?.score}），最短板是${worst?.label}（${worst?.score}）。共识别 ${risks.length} 条风险，其中 ${highRisks.length} 条为高风险。如果只有一周，先做三件事：${p0.map((r) => r.title).join('；') || '补齐证据链'}。`;

  return { scores, risks, revisions, summary, overall };
}
