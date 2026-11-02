export type PersonaId = 'host' | 'method' | 'industry' | 'judge' | 'presenter';

export interface Persona {
  id: PersonaId;
  name: string;
  title: string;
  short: string;
  color: string;
  focus: string;
  bio: string;
}

export const PERSONAS: Record<PersonaId, Persona> = {
  host: {
    id: 'host',
    name: '闻野',
    title: '主持人',
    short: '闻',
    color: '#9AA4B2',
    focus: '节奏控制与结论收束',
    bio: '不站队，只负责把每一个含糊的回答追问到不能再含糊。',
  },
  method: {
    id: 'method',
    name: '沈砚',
    title: '方法学教授',
    short: '沈',
    color: '#E8B45A',
    focus: '实验设计 · 基线 · 可复现',
    bio: '做过十年系统评测，对「显著提升」四个字有生理性反感。',
  },
  industry: {
    id: 'industry',
    name: '罗启',
    title: '产业评委',
    short: '罗',
    color: '#5FD3C4',
    focus: '场景真伪 · 成本 · 壁垒',
    bio: '看过太多 Demo 很酷、账单很贵的项目。',
  },
  judge: {
    id: 'judge',
    name: '周律',
    title: '竞赛评审',
    short: '周',
    color: '#B79CFF',
    focus: '规则 · 原创 · 交付闭环',
    bio: '按评分表逐条对照，不接受「大概」「应该」。',
  },
  presenter: {
    id: 'presenter',
    name: '林澈',
    title: '答辩人（AI 替身）',
    short: '林',
    color: '#8FD694',
    focus: '基于材料自动应答',
    bio: '你的数字替身。它只知道你材料里写过的东西——这正是压力测试的意义。',
  },
};

export type ClaimKind = '创新' | '方法' | '数据' | '应用' | '团队' | '承诺';
export type Strength = 'strong' | 'medium' | 'weak';

export type IssueCode =
  | 'no_baseline'
  | 'no_sample'
  | 'causal'
  | 'vague'
  | 'promise'
  | 'no_source'
  | 'buzzword'
  | 'none';

export const ISSUE_LABELS: Record<IssueCode, string> = {
  no_baseline: '缺少基线对比',
  no_sample: '缺少样本说明',
  causal: '相关性当因果',
  vague: '表述含糊',
  promise: '承诺性指标',
  no_source: '数据无出处',
  buzzword: '概念堆叠',
  none: '证据完整',
};

export interface Claim {
  id: string;
  text: string;
  kind: ClaimKind;
  strength: Strength;
  issues: IssueCode[];
  section: string;
  chunkId: string;
  score: number;
  evidence?: string;
}

export interface CoverageItem {
  key: string;
  label: string;
  ok: boolean;
  note: string;
}

export interface MaterialHealth {
  score: number;
  totalChars: number;
  chunkCount: number;
  claimCount: number;
  strongRatio: number;
  evidenceDensity: number;
  coverage: CoverageItem[];
  findings: string[];
}

export interface Chunk {
  id: string;
  section: string;
  text: string;
  index: number;
}

export interface Project {
  id: string;
  name: string;
  track: string;
  team: string;
  summary: string;
  materialNames: string[];
  text: string;
  chunks: Chunk[];
  claims: Claim[];
  health: MaterialHealth;
  createdAt: string;
}

export interface Citation {
  chunkId: string;
  section: string;
  snippet: string;
  score: number;
}

export type TurnKind =
  | 'system'
  | 'opening'
  | 'question'
  | 'answer'
  | 'followup'
  | 'verdict'
  | 'summary';

export interface Turn {
  id: string;
  round: number;
  persona: PersonaId;
  kind: TurnKind;
  text: string;
  citations: Citation[];
  claimId?: string;
  target?: PersonaId;
  theme?: string;
  createdAt: string;
  risk?: 'high' | 'medium' | 'low';
}

export type SessionStatus = 'ready' | 'running' | 'completed';

export interface DimensionScore {
  key: string;
  label: string;
  score: number;
  delta: number;
  note: string;
}

export interface RiskItem {
  id: string;
  dimension: string;
  title: string;
  level: 'high' | 'medium' | 'low';
  detail: string;
  claimId?: string;
  turnId?: string;
}

export interface Revision {
  id: string;
  priority: 'P0' | 'P1' | 'P2';
  title: string;
  detail: string;
  claimId?: string;
  effort: '低' | '中' | '高';
  gain: number;
}

export interface Session {
  id: string;
  projectId: string;
  projectName: string;
  track: string;
  status: SessionStatus;
  mode: 'mock' | 'llm';
  intensity: '标准' | '高压';
  turns: Turn[];
  scores: DimensionScore[];
  risks: RiskItem[];
  revisions: Revision[];
  summary: string;
  overall: number;
  progress: number;
  createdAt: string;
  completedAt?: string;
  speed: number;
}

export type StreamEvent =
  | { type: 'turn:start'; turn: Turn }
  | { type: 'turn:delta'; id: string; delta: string }
  | { type: 'turn:end'; turn: Turn }
  | { type: 'status'; status: SessionStatus; progress: number }
  | {
      type: 'report';
      scores: DimensionScore[];
      risks: RiskItem[];
      revisions: Revision[];
      summary: string;
      overall: number;
    }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface SessionMeta {
  id: string;
  projectName: string;
  track: string;
  status: SessionStatus;
  overall: number;
  createdAt: string;
  turnCount: number;
  topRisk: string;
}

export const TRACKS = ['大创项目', '毕业设计', '挑战杯', '互联网+', '课程答辩'] as const;
