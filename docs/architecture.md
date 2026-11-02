# 架构设计 · 答辩预演舱

## 1. 设计目标

| 目标 | 约束 |
| --- | --- |
| 5 分钟演示闭环 | 首页 → 预检 → 质询 → 报告，全部在一个产品内完成 |
| 无 Key 可复现 | 默认离线确定性引擎；真实 LLM 只作为可选增强 |
| 每个结论可回放 | 追问必须绑定 `claimId`，报告风险必须绑定 `turnId` |
| 单进程交付 | 生产模式一个 Node 进程托管 API + 静态资源 |
| 前端不引 UI 框架 | 自建设计系统，避免模板感与依赖膨胀 |

## 2. 分层

```text
┌─────────────────────────────────────────────────────────┐
│ Presentation                                            │
│ React 18 · Vite · React Router · 自建 CSS Design System │
│ Dashboard / SessionRoom / Report / MakingOf             │
└───────────────────────┬─────────────────────────────────┘
                        │ fetch + EventSource
┌───────────────────────▼─────────────────────────────────┐
│ Interface                                               │
│ Express Router · multer · zod · SSE                     │
│ /api/projects /api/sessions /api/sessions/:id/events    │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Application                                             │
│ Orchestrator: start → stream → persist → report         │
│ Script: PlannedTurn[] · Scoring: risks/revisions        │
│ LLM Adapter: OpenAI-compatible, fallback to mock        │
└───────────────────────┬─────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────┐
│ Domain                                                  │
│ Analyze: sections → chunks → claims → health            │
│ Text: Chinese tokenizer · BM25 · sentence split         │
│ Store: JSON repository, atomic write                    │
└─────────────────────────────────────────────────────────┘
```

## 3. 请求时序

### 3.1 上传与解析

```text
Client                API                  Domain
  │  POST /projects     │                    │
  │  multipart files    │                    │
  │────────────────────>│  extract text      │
  │                     │───────────────────>│  mammoth / pdf-parse
  │                     │                    │  normalize
  │                     │                    │  splitSections
  │                     │                    │  chunkText
  │                     │                    │  extractClaims
  │                     │                    │  analyzeHealth
  │<────────────────────│  Project + claims  │
```

解析失败会返回 400 + 可读错误（扫描版 PDF、空文件、格式不支持）。

### 3.2 质询流

```text
Client              API                Orchestrator           Store
  │ POST /start       │                    │                   │
  │──────────────────>│ startSession       │                   │
  │<──────────────────│ {ok:true}          │                   │
  │                   │                    │ status=running    │
  │                   │                    │──────────────────>│
  │ EventSource       │                    │                   │
  │──────────────────>│ subscribe + replay │                   │
  │                   │<───────────────────│ turn:start        │
  │<──────────────────│ SSE                │                   │
  │                   │                    │ turn:delta × N    │
  │<──────────────────│ SSE                │                   │
  │                   │                    │ persist turn      │
  │                   │                    │──────────────────>│
  │                   │                    │ turn:end          │
  │<──────────────────│ SSE                │                   │
  │                   │                    │ ... 27/31 turns   │
  │                   │                    │ buildReport       │
  │                   │                    │ status=completed  │
  │<──────────────────│ report + done      │                   │
```

## 4. 多 Agent 状态机

```text
IDLE
  │ start
  ▼
OPENING (host)
  │
  ▼
ROUND 1 ── method.question → presenter.answer → method.followup → presenter.answer
  │            └─ high pressure: + causal chain
  ▼
ROUND 2 ── industry.question → answer → industry.followup → answer
  │
  ▼
ROUND 3 ── judge.question(originality) → answer → judge.followup(reproducibility) → answer
  │
  ▼
ROUND 4 ── method.question(sample) → answer → followup → answer
  │
  ▼
ROUND 5 ── judge.question(promise) → answer → followup(proof) → answer
  │
  ▼
VERDICT × 3 (method / industry / judge)
  │
  ▼
SUMMARY (host) + REPORT
  │
  ▼
COMPLETED
```

每个 Turn 的字段：

| 字段 | 用途 |
| --- | --- |
| `persona` | 决定头像、颜色、语气、Prompt |
| `kind` | 决定气泡样式与前端渲染（问题/应答/裁决/系统） |
| `claimId` | 关联材料论点；左栏高亮、风险回跳 |
| `citations` | BM25 检索出的原文片段；证据芯片 |
| `risk` | 该轮是否触发高风险信号；右侧实时累计 |
| `theme` | 追问主题（baseline/sample/cost/originality/...） |

## 5. 论点抽取

### 5.1 切块

- 标题识别：Markdown `#` / 中文序号 `一、` / 数字序号 `1.`。
- 每块 ≤ 620 字；章节标题保留在 `Chunk.section`，用于证据展示。

### 5.2 句子打分

```text
score = 48
      + 10  if 含数字
      + 13  if 含样本量（份/间/人/所/次/周/分钟/元…）
      + 10  if 含基线词（相比/对比/传统/人工…）
      +  6  if 含创新词（提出/首次/自研…）
      + 14  if “提出…框架/方法/系统”
      +  4  if 含准确率/召回率/F1
      +  2  if 含“达到/提升至”
      − 14  if promise
      −  8  if vague
      −  7  if buzzword
      −  7  if no_baseline
      −  5  if no_sample
      −  4  if no_source
```

`strong ≥ 78`，`medium ≥ 60`，否则 `weak`。

### 5.3 排序

```text
rank = score
     + kindBonus（数据 10 / 创新 9 / 方法 6 / 应用 4 / 承诺 3）
     + sectionBonus（背景 −16；方案/数据/试点/成果 +9）
     − issues × 2
     + 长度奖励
```

选 12 条，单类型最多 4 条；承诺句强制保留 1 条（优先带 `%`）。

## 6. BM25 检索

- 中文：字符 unigram + bigram；英文/数字保留词。
- 去停用词（的/了/在/是/我们/通过…）。
- `k1=1.4, b=0.75`。
- 每条追问取 top 2；无命中时回退到论点所在 chunk。
- 证据芯片展示：章节、片段、BM25 分数、chunkId。

## 7. 评分模型

### 7.1 维度与权重

| 维度 | 权重 | 主要风险来源 |
| --- | ---: | --- |
| 创新性 | 22% | buzzword、原创边界 |
| 可行性 | 22% | 成本、团队、场景 |
| 证据强度 | 26% | no_baseline / no_sample / causal |
| 表达清晰度 | 14% | vague、promise |
| 合规与复现 | 16% | no_source、reproducibility |

### 7.2 计算

```text
base = {创新 79, 可行 76, 证据 76, 表达 83, 合规 77}
for risk in risks[dimension]:
    deducted += {high: 7, medium: 4, low: 2}
score[dim] = clamp(base - min(16, deducted), 48, 93)
overall = Σ score[dim] × weight
```

风险按标题去重；修订项按标题再去重。这样既保留“锋利”，又不会一个缺口把整维打到地板。

## 8. 意图控制

### 8.1 Prompt 分层

| 层 | 内容 | 约束 |
| --- | --- | --- |
| 角色层 | 姓名、头衔、关注点、语气 | 只问职责内的问题 |
| 任务层 | 当前 theme、目标 claim、轮次 | 一次只问一件事 |
| 证据层 | 论点原文 + BM25 片段 | 必须引用，不得编造数字 |
| 格式层 | 80–120 字、中文、无前缀 | 只输出台词 |
| 安全层 | 不人身攻击、不预测奖项、不替代真实评审 | 拒绝越界 |

### 8.2 上下文预算

真实 LLM 模式每次只带：

```text
项目名称 + 当前论点 + 最近 4 轮对话 + 本轮任务
```

不塞完整材料，避免长上下文漂移；材料事实由 BM25 片段提供。

### 8.3 失败回退

```text
AI_MODE=openai 且 OPENAI_API_KEY 存在
  → 请求 /chat/completions
  → 非 200 / 超时 / 空内容
  → 返回 null
  → orchestrator 使用 script.ts 的原始台词
```

因此“真实模型”是增强，不是单点依赖。

## 9. 持久化

`apps/server/data/db.json`：

```json
{
  "projects": [{ "id": "p-demo", "claims": [], "chunks": [], "health": {} }],
  "sessions": [{ "id": "s-...", "turns": [], "scores": [], "risks": [], "revisions": [] }]
}
```

- 单进程、同步写、临时文件 + rename 原子替换。
- 启动时把 `status=running` 的会话重置为 `ready`，避免进程崩溃后卡死。
- 生产环境可替换为 SQLite/Postgres；`store.ts` 是唯一数据访问层。

## 10. 安全与边界

| 风险 | 处理 |
| --- | --- |
| 上传恶意文件 | 限制 20MB / 6 个；仅解析 pdf/docx/md/txt；不执行宏 |
| XSS | React 默认转义；不使用 `dangerouslySetInnerHTML` |
| 路径穿越 | 文件只存内存，不按原始文件名落盘 |
| 隐私 | 材料只写本机；mock 模式无出站请求；报告可本地删除 |
| 模型越界 | Prompt 明确“不预测奖项、不替代真实评审”；页面有免责声明 |
| 评分误导 | 报告注明“演练参考”；风险必须可回跳证据 |

## 11. 性能

- 示例材料 1.5k 字：解析 < 50ms；BM25 建索引 < 10ms。
- 27 轮 SSE：约 20–40 秒（speed=1），可调 1–4 倍。
- 前端首屏 JS 239 kB（gzip 79 kB），CSS 49 kB（gzip 10 kB）。
- 无数据库、无外部服务，冷启动 < 1s。

## 12. 可演进方向

1. 接入真实向量库（pgvector/Qdrant），支持长论文与多文档。
2. 人工答辩模式：用户实时输入回答，评审动态追问。
3. 多评委圆桌：评审之间互相质疑，出现“评审冲突”。
4. 赛道模板：大创/毕设/挑战杯/互联网+ 使用不同评分权重与问题库。
5. 版本对比：两次演练的分数、风险、修订完成度 diff。
