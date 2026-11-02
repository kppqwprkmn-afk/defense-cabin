# Prompt 链 · 03 多 Agent 编排与 SSE

> 时间：2026-11-02  
> 阶段：编排 / 流式 / 持久化  
> 对应提交：`feat/orchestrator`、`fix/sse-replay`

## 1. 人类输入

```text
设计一条 20 轮左右的质询链：
主持人开场 → 方法学教授追问基线 → 答辩人应答 → 追问 →
产业评委问成本 → 竞赛评审问复现 → 独立裁决。

要求：
1. 三个评审的语气和关注点必须不同，不能像同一个模型换皮；
2. 每个问题必须绑定材料里的一条论点，并给出证据引用；
3. 用 SSE 流式输出，逐字显示；
4. 刷新页面不能丢记录；断线重连要能接上。
```

## 2. AI 产出

AI 把问题拆成两层：

### 2.1 剧本层 `engine/script.ts`

输出 `PlannedTurn[]`：

```ts
interface PlannedTurn {
  persona: 'host' | 'method' | 'industry' | 'judge' | 'presenter';
  kind: 'opening' | 'question' | 'answer' | 'followup' | 'verdict' | 'summary';
  theme?: 'baseline' | 'sample' | 'cost' | 'originality' | ...;
  text: string;
  claimId?: string;
  risk?: 'high' | 'medium' | 'low';
  round: number;
}
```

选点策略：

- `baseline` 优先选“带百分比的 no_baseline 论点”；
- `sample` 排除 baseline / innovation / promise，避免同一句被问两遍；
- `cost` 优先选带“成本/元/部署”的句子；
- `promise` 优先选带 `%` 的承诺句；
- 高压模式额外插入“因果归因”追问链。

### 2.2 播放层 `engine/orchestrator.ts`

- `startSession()` 先落库 `status=running`，再异步开跑；
- 每个 Turn：`turn:start` → 逐 3 字 `turn:delta`（13ms/字，按 speed 缩放）→ 落库 → `turn:end`；
- 完成后统一计算 `report`，落库并广播 `status=completed`、`report`、`done`；
- SSE 连接时**先 subscribe，再 replay** 已落库的 turns。

## 3. 翻车现场

### Bug A：前几条消息丢失

前端流程是 `POST /start` → 再 `new EventSource()`。  
服务端在 POST 返回时已经开始推流，EventSource 建立前的前 2–3 个 Turn 直接丢了。

### Bug B：刷新后重复

刷新时前端先从 `GET /session/:id` 拿到全部 turns，SSE 又 replay 一遍；  
`turn:start` 无条件 push，导致同一 Turn 出现两次。

## 4. 人工纠偏

```text
先订阅再重放，别让 replay 和 live 之间有空窗。
前端所有写入按 turn.id 去重：start 时若已存在就跳过，end 时覆盖同 id 的流式占位。
另外把 Turn 落库放在 turn:end 之前，保证断线后能恢复到“已经说完”的状态。
```

## 5. 修复

```ts
// routes.ts
const unsubscribe = subscribe(session.id, send);
for (const event of replayEvents(session)) send(event);
```

```ts
// SessionRoom.tsx
if (event.type === 'turn:start') {
  setTurns((prev) => prev.some((t) => t.id === event.turn.id) ? prev : [...prev, event.turn]);
}
if (event.type === 'turn:end') {
  setTurns((prev) => prev.some((t) => t.id === event.turn.id)
    ? prev.map((t) => (t.id === event.turn.id ? event.turn : t))
    : [...prev, event.turn]);
}
```

## 6. 验证

- 质询中刷新页面：已完成的 Turn 全部恢复，正在流的 Turn 不重复。
- 关掉 Wi-Fi 再恢复：EventSource 自动重连，replay 补齐。
- 标准 27 轮 / 高压 31 轮，全部落库，`turns.length` 与页面一致。

## 7. 复现

```bash
# 启动后打开一场演练，质询中刷新页面
# 或直接看 data/db.json 中的 turns 数组
```
