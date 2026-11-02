import type { Claim, Project, TurnKind, PersonaId } from '@cabin/shared';
import { clip } from '../domain/text.js';

export type Theme =
  | 'baseline'
  | 'sample'
  | 'causal'
  | 'promise'
  | 'source'
  | 'vague'
  | 'originality'
  | 'reproducibility'
  | 'proof'
  | 'demo'
  | 'cost'
  | 'moat'
  | 'privacy'
  | 'scale'
  | 'team';

export interface PlannedTurn {
  persona: PersonaId;
  kind: TurnKind;
  theme?: Theme;
  text: string;
  claimId?: string;
  target?: PersonaId;
  round: number;
  risk?: 'high' | 'medium' | 'low';
}

function metricOf(text: string): string {
  const pct = text.match(/\d+(?:\.\d+)?\s*%/)?.[0];
  if (pct) return pct.replace(/\s/g, '');
  const range = text.match(
    /(\d+(?:\.\d+)?\s*(?:分钟|小时|天|周))\s*(?:缩短|降|减少)?(?:至|到)\s*(\d+(?:\.\d+)?\s*(?:分钟|小时|天|周))/,
  );
  if (range) return `${range[1]} → ${range[2]}`;
  const num = text.match(/\d+(?:\.\d+)?\s*(?:倍|分钟|小时|天|周|元|万|所|间)/)?.[0];
  return num ?? '这组数据';
}

function quoteOf(claim?: Claim): string {
  if (!claim) return '你材料里的核心结论';
  return clip(claim.text.replace(/[。．.；;]+$/, ''), 70);
}

const PICK = (claims: Claim[], pred: (c: Claim) => boolean, fallback = 0): Claim | undefined =>
  claims.find(pred) ?? claims[fallback % Math.max(1, claims.length)];

export function buildScript(project: Project, intensity: '标准' | '高压'): PlannedTurn[] {
  const claims = project.claims;
  const data = PICK(claims, (c) => c.kind === '数据' && c.strength !== 'weak') ?? claims[0];
  const baseline =
    PICK(claims, (c) => c.issues.includes('no_baseline') && /%/.test(c.text)) ??
    PICK(claims, (c) => c.issues.includes('no_baseline')) ??
    data;
  const causal = PICK(claims, (c) => c.issues.includes('causal') && c.id !== baseline?.id) ?? data;
  const promise = PICK(claims, (c) => c.issues.includes('promise') && /%/.test(c.text)) ?? PICK(claims, (c) => c.issues.includes('promise')) ?? claims[claims.length - 1];
  const source = PICK(claims, (c) => c.issues.includes('no_source') && c.id !== baseline?.id) ?? data;
  const app = PICK(claims, (c) => c.kind === '应用') ?? claims[1];
  const cost = PICK(claims, (c) => /成本|元|部署|收费|运维/.test(c.text)) ?? app;
  const innovation = PICK(claims, (c) => c.kind === '创新') ?? claims[0];
  const sample = PICK(
    claims,
    (c) =>
      c.issues.includes('no_sample') &&
      !c.issues.includes('promise') &&
      c.id !== baseline?.id &&
      c.id !== innovation?.id,
  ) ?? data;

  const m1 = metricOf(baseline?.text ?? '');
  const q1 = quoteOf(baseline);
  const q2 = quoteOf(cost);
  const q3 = quoteOf(innovation);
  const q4 = quoteOf(sample);
  const q5 = quoteOf(promise);

  const turns: PlannedTurn[] = [
    {
      persona: 'host',
      kind: 'opening',
      round: 0,
      text: `材料已解析，识别出 ${claims.length} 个可质询论点。本轮采用“${intensity}”模式：方法、产业、竞赛三位评审交叉提问，答辩人由你的材料替身应答。规则只有一条——每个结论都要能落到证据上。`,
    },
    {
      persona: 'method',
      kind: 'question',
      round: 1,
      theme: 'baseline',
      claimId: baseline?.id,
      target: 'presenter',
      text: `我先追问方法本身。你写「${q1}」。${m1}的基线是什么？同数据集、同参数量、同标注规范下的对照有没有？如果没有，这个数字说明不了方法贡献，只能说明你们跑通了一个系统。`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 1,
      theme: 'baseline',
      claimId: baseline?.id,
      target: 'method',
      text: `目前主要和实验室上一版人工巡检流程做对比。严格意义上的同参数量基线还在补，${m1}是在我们自己划分的测试集上得到的，基线模型这周才跑通。`,
    },
    {
      persona: 'method',
      kind: 'followup',
      round: 1,
      theme: 'baseline',
      claimId: baseline?.id,
      target: 'presenter',
      risk: 'high',
      text: `也就是说，${m1}目前既没有同参数量基线，也没有置信区间。如果评委把测试集换成另一所学校的 20 间实验室，你预计会掉到多少？你敢给一个区间吗？`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 1,
      theme: 'baseline',
      claimId: baseline?.id,
      target: 'method',
      text: `跨校肯定会掉。我们内部估的是 8 到 15 个百分点，但没有做正式测试，所以不敢写进材料。`,
    },
    {
      persona: 'host',
      kind: 'system',
      round: 1,
      text: '记录：第一条高风险——量化结论缺少基线，跨校泛化未验证。',
    },
    {
      persona: 'industry',
      kind: 'question',
      round: 2,
      theme: 'cost',
      claimId: cost?.id,
      target: 'presenter',
      text: `我从落地角度问一个不太客气的问题。你写「${q2}」。落到真实场景，部署、标注、运维、换件，这一整套谁付钱？单间全生命周期成本算过吗？`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 2,
      theme: 'cost',
      claimId: cost?.id,
      target: 'industry',
      text: `目前报的是物料成本，不含安装和标注。加上入校施工和标注，首年综合成本大概是硬件的三到四倍。`,
    },
    {
      persona: 'industry',
      kind: 'followup',
      round: 2,
      theme: 'moat',
      claimId: cost?.id,
      target: 'presenter',
      risk: 'medium',
      text: `三到四倍？也就是说单间首年要六千到七千。比请两个兼职安全员便宜吗？如果学校采购现成的安防平台，加一个巡检模块，你的壁垒到底是什么？`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 2,
      theme: 'moat',
      claimId: cost?.id,
      target: 'industry',
      text: `短期壁垒是本校的隐患数据和检查标准，现成平台不懂“气瓶未固定”这类专业语义。长期希望把知识库做成可复制的东西。`,
    },
    {
      persona: 'judge',
      kind: 'question',
      round: 3,
      theme: 'originality',
      claimId: innovation?.id,
      target: 'presenter',
      text: `按竞赛评审口径，我要确认原创边界。你写「${q3}」。YOLO、Whisper、Qwen 都是现成模型，去掉它们，你的原创贡献用一句话说清楚。`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 3,
      theme: 'originality',
      claimId: innovation?.id,
      target: 'judge',
      text: `原创主要在两部分：隐患知识库的编码方式，以及时序一致性校验模块。底座模型确实是开源的，我们做的是领域适配和系统集成。`,
    },
    {
      persona: 'judge',
      kind: 'followup',
      round: 3,
      theme: 'reproducibility',
      claimId: innovation?.id,
      target: 'presenter',
      risk: 'high',
      text: `好，那复现呢？评委按 README 十分钟能复现哪一段？模型权重、试点实验室的原始数据、边缘盒固件，哪几样是公开的？如果都不公开，“可复现”复现的到底是什么？`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 3,
      theme: 'reproducibility',
      claimId: innovation?.id,
      target: 'judge',
      text: `代码和示例数据会开源，模型权重和原始画面涉及学校数据授权，只能提供脱敏子集。边缘盒固件暂时不开源。`,
    },
    {
      persona: 'method',
      kind: 'question',
      round: 4,
      theme: 'sample',
      claimId: sample?.id,
      target: 'presenter',
      text: `我回到数据。你写「${q4}」。这个数字背后的样本量、抽样方式和场景分布是什么？如果是自愿报名，最难的场景可能根本没进样本。`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 4,
      theme: 'sample',
      claimId: sample?.id,
      target: 'method',
      text: `试点覆盖了三所高校的几十间实验室，但确实不是随机抽样，主要是自愿报名；也没有按实验室类型分层。`,
    },
    {
      persona: 'method',
      kind: 'followup',
      round: 4,
      theme: 'sample',
      claimId: sample?.id,
      target: 'presenter',
      risk: 'high',
      text: `自愿报名意味着最难的场景可能根本没进样本。你有没有按实验室类型分层报告？如果没有，这个平均数会把最难的场景稀释掉。`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 4,
      theme: 'sample',
      claimId: sample?.id,
      target: 'method',
      text: `目前只报了总体平均，没有分层。危化品场景的召回确实低一些，具体数字我手头没有。`,
    },
    {
      persona: 'judge',
      kind: 'question',
      round: 5,
      theme: 'promise',
      claimId: promise?.id,
      target: 'presenter',
      text: `最后一条，材料合规。你写「${q5}」。这是目标还是结论？有历史事故基数、测算模型和置信范围吗？如果没有，评审会把它判成过度承诺。`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 5,
      theme: 'promise',
      claimId: promise?.id,
      target: 'judge',
      text: `60% 是按同类事故率做的目标测算，目前只有 6 周试点数据，还不足以证明因果。表述上确实写得太满了。`,
    },
    {
      persona: 'judge',
      kind: 'followup',
      round: 5,
      theme: 'proof',
      claimId: promise?.id,
      target: 'presenter',
      risk: 'medium',
      text: `还有佐证。专利是受理还是授权？软著登记号、试点数据的使用授权、伦理审批，现场能拿出哪几样？`,
    },
    {
      persona: 'presenter',
      kind: 'answer',
      round: 5,
      theme: 'proof',
      claimId: promise?.id,
      target: 'judge',
      text: `两项专利目前是受理通知书，软著已经登记，登记号在附件里。试点数据有学校盖章的使用说明，但没有走伦理审批，因为不采集身份信息。`,
    },
    {
      persona: 'host',
      kind: 'system',
      round: 5,
      text: '质询环节结束。三位评审进入独立裁决。',
    },
    {
      persona: 'method',
      kind: 'verdict',
      round: 6,
      text: `工程完成度不错，但评测章撑不起${m1}。先把同参数量基线、分层样本和消融补齐，否则创新点会被判成工程集成。`,
    },
    {
      persona: 'industry',
      kind: 'verdict',
      round: 6,
      text: '场景是真的，痛点也是真的，但买单的人还没出现。先把单间全生命周期成本和校方预算对齐，再谈复制。',
    },
    {
      persona: 'judge',
      kind: 'verdict',
      round: 6,
      text: '规则层面有两处硬伤：专利是受理不是授权，复现材料缺权重与数据。把这两处补实，材料才经得起形式审查。',
    },
    {
      persona: 'host',
      kind: 'summary',
      round: 6,
      text: '',
    },
  ];

  if (intensity === '高压') {
    turns.splice(5, 0, {
      persona: 'method',
      kind: 'question',
      round: 1,
      theme: 'causal',
      claimId: causal?.id,
      target: 'presenter',
      text: `再追一刀。你写「${quoteOf(causal)}」。这个时间或效率变化里，系统贡献了多少，管理流程调整贡献了多少？做过归因吗？`,
    });
    turns.splice(6, 0, {
      persona: 'presenter',
      kind: 'answer',
      round: 1,
      theme: 'causal',
      claimId: causal?.id,
      target: 'method',
      text: `没有做严格归因。系统上线和保卫处调整值班是同一周发生的，我们只能观察到时间下降，不能把因果完全归给系统。`,
    });
    turns.splice(7, 0, {
      persona: 'method',
      kind: 'followup',
      round: 1,
      theme: 'causal',
      claimId: causal?.id,
      target: 'presenter',
      risk: 'high',
      text: `那这个降幅就不能写成系统效果。你准备怎么改这句？是补归因实验，还是把结论降级为相关性描述？`,
    });
    turns.splice(8, 0, {
      persona: 'presenter',
      kind: 'answer',
      round: 1,
      theme: 'causal',
      claimId: causal?.id,
      target: 'method',
      text: `会改成“试点期间平均响应时间下降”，并补一句多因素说明。严格归因需要下一轮对照试点。`,
    });
  }

  return turns.map((t, i) => ({ ...t, round: t.round || Math.min(6, Math.floor(i / 4)) }));
}

export function answerFor(theme: Theme | undefined): string {
  switch (theme) {
    case 'baseline':
      return '目前主要和人工流程对比，同参数量基线还没跑完，指标是在自建测试集上得到的。';
    case 'sample':
      return '样本是自愿报名的 47 间实验室，没有做随机抽样，也没有按实验室类型分层报告。';
    case 'causal':
      return '时间下降和保卫处排班调整同时发生，我们没有做严格归因，只能算相关。';
    case 'promise':
      return '这是目标测算，不是已证实的结论，材料里的表述确实写满了。';
    case 'source':
      return '原始记录在团队共享盘里，材料里只放了汇总表，没有逐条出处。';
    case 'vague':
      return '“显著提升”目前只有均值，没有方差和显著性检验。';
    case 'originality':
      return '原创主要在领域知识库编码和时序校验，底座模型是开源的。';
    case 'reproducibility':
      return '代码和示例数据会开源，权重和原始画面受学校授权限制，只能给脱敏子集。';
    case 'proof':
      return '专利是受理通知书，软著已登记；试点数据有使用说明，但没有伦理审批。';
    case 'demo':
      return '现场用本地缓存和离线模型，断网能跑识别，云端报告会降级。';
    case 'cost':
      return '1800 元是物料成本，首年综合成本约 12 万，主要是标注和施工。';
    case 'moat':
      return '短期靠本校数据和检查标准，长期希望把知识库产品化。';
    case 'privacy':
      return '原始视频不出校，边缘侧做人脸模糊，但运维责任边界还没完全定。';
    case 'scale':
      return '从 3 所到 10 所，标注和入校实施是主要边际成本，短期内不会显著下降。';
    case 'team':
      return '核心算法 2 人，前端 1 人，硬件 1 人，安全工程 2 人，关键模块有备份。';
    default:
      return '这部分我们还在补，当前材料只能支撑阶段性结论。';
  }
}
