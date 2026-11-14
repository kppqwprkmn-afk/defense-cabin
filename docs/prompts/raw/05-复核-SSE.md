# 补充复核 · SSE 流式

> 时间：2026-11-14
> 类型：作品完成后的补充复核对话（非原始开发记录）
> 工具：DeepSeek Harness

## 用户 Prompt 1

你是我的 AI 编程搭档。项目在当前目录。

先不要改代码。请检查：
- apps/server/src/engine/orchestrator.ts
- apps/server/src/routes.ts
- apps/web/src/pages/SessionRoom.tsx
- apps/web/src/api.ts

真实现象：
1. 质询过程中偶尔丢中间消息；
2. 刷新页面后，同一个 Turn 会重复出现；
3. 断线重连后接不上。

请画出“订阅 → 重放 → 落库 → 广播 → 前端去重”的时序，指出具体竞态，给最小修复方案和 3 条测试点。
不要重写整套架构。

## AI 回复 1

四个文件读完了，先给结论：**“先订阅再重放”“落库后再广播”“前端按 turn.id 去重”“正在输出的 Turn 进重放”这四条当前代码里都已经有了**（说明这个工作副本是修复后的状态）。所以下面不是“找三个 bug”，而是把链路画清楚，指出**已经挡住的竞态**和**仍然裸露的缝隙**，最后只补缝隙。

### 1. 时序（行号对应当前工作副本）

```
 orchestrator.run()            routes.ts GET /events            SessionRoom.tsx
 ────────────────────          ──────────────────────            ───────────────
 turn 建好 (t1)         L122
 inflight.set(t1)       L138
 emit turn:start        L139 ──┐
 loop: emit turn:delta  L150 ──┤  (每片 3 字，间隔 13ms/speed)
                               │
                               │        ① 先 subscribe()      L244
                               │        ② 再 replayEvents()   L245
                               │           - 已落库 turn:end（幂等，按 id 去重）
                               │           - inflight 的 turn:start（带已吐文本）
                               │           - status / report / done
                               │
 turn.text = 全量        L155
 live.turns.push(turn)  L156
 store.saveSession()    L157   ← 落库先于广播
 inflight.delete(t1)    L158
 emit turn:end          L159 ──┤
 emit status            L160 ──┘
                               ↓
                                                     setTurns(prev => 按 turn.id 合并)
                                                     turn:start  L128-L140
                                                     turn:delta  L142-L145
                                                     turn:end    L146-L152
```

骨架就是三句话：**连接时先订阅再重放；单条 Turn 先落库再广播；前端所有事件按 `turn.id` 合并**。

### 2. 具体竞态：哪些已经挡住，哪些还露着

**R1 订阅晚于重放（现象 3 的根因，已挡住）。**
`emit` 是 fire-and-forget（`orchestrator.ts` L38-L50，无队列、无事件序号），两步之间的任何 `emit` 都会永久丢失。当前 L244→L245 是订阅在前；而且两步之间没有 `await`，Node 单线程内不可能被别的请求插进来。指针是对的，但这是**顺序**保证而非**契约**保证——把两行对调，测试依然全绿。

**R2 落库与广播倒置（现象 1/2 的放大器，已挡住）。**
若先 `emit turn:end` 再 `saveSession`，客户端立刻看到完整 Turn，而刷新后 `GET /api/sessions/:id` 读到的 `turns` 里没有它，重放也没有——同一条在“实时视图”存在、“服务端真相”不存在，于是时隐时现、顺序错乱。当前 L156-L157 的 push+save 在 L159 广播之前，方向正确。

**R3 刷新后重复（现象 2，客户端已挡住，服务端原本靠运气）。**
刷新时前端先 `setTurns(s.turns)`（`SessionRoom.tsx` L80），随后重放又把同一批 `turn:end` 发一遍。前端 L146-L152 是 `exists ? 替换 : 追加`，按 id 合并，不会渲染两条。但**服务端重放本身不是幂等的**：`replayEvents` 无条件遍历 `session.turns`，一旦数组里出现重复 id（并发 save、未来做分页/续跑），就会发出重复事件，把去重压力全推给客户端。这是本次唯一真正补掉的缝。

**R4 重连时“半句”的倒序（现象 3 的残余，已堵大半）。**
`replayEvents(session, pending)` 的 `pending` 默认取 `getInflightTurn()`（L230）。正常情况下 inflight 在落库后被删（L158），不会重放已落库的 Turn。但函数对“pending 其实已落库”没有防御：若调用方持有旧快照，就会先发 `turn:end t3`、再发 `turn:start t3`（旧半句），前端靠“取更长文本”（L136-L139）侥幸不倒退，语义上却是一次假重放。靠前端兜底的约定太脆。

**R5 广播期间订阅者集合被修改（低概率）。**
`emit` 直接迭代活 Set（L38-L48）。Set 迭代器会看见迭代期间新增的元素，若监听者在广播过程中挂载/卸载，本次事件的接收者集合就不确定。

**R6 Turn id 的作用域（已知限制）。**
`id: t${++n}`（L123）只在单次 run 内唯一；`startSession` 重置 `turns=[]` 后 `n` 从 1 重来（L197）。前端 `begin()` 会 `setTurns([])`（L111），当前场景不触发；但跨标签页/续跑场景下两轮 t1 会被合并。改 id 规则会动数据契约，不在最小修复范围。

**R7 缺少重连节奏与游标（体验层）。**
`connectStream` 的 `onerror` 只回调不关流（`api.ts` L84-L86），靠 `EventSource` 自动重连；服务端没发 `retry:`，重连间隔由浏览器默认值决定（各浏览器不同，演示时会有明显空窗）。没有 `Last-Event-ID` 游标，每次重连全量重放——当前 27 条的量级下这是合理取舍，不改成另一套协议。

### 3. 最小修复方案（不换架构）

1. `routes.ts`：保留“订阅在前”的固定顺序并写成注释（缺口不可恢复、重复可由 id 消掉），流开头补 `retry: 2000`。
2. `orchestrator.ts`：`emit` 对订阅者集合做快照（`[...set]`）再遍历，广播集合在一次事件内固定。
3. `orchestrator.ts`：`replayEvents` 做成幂等——已落库 Turn 按 id 只发一次；`pending` 若已落库就不再补 `turn:start`。
4. 前端 `SessionRoom.tsx` / `api.ts` 不动：`turn:start` 合并、`turn:end` 替换/追加、`turn:delta` 按 id 追加已经覆盖要求 3、4。
5. 不碰 `run()` 的分片节奏、`store` 的内存+JSON 模型、`EventSource` 传输方式。

### 4. 三条测试点

1. **落库顺序**：`saveSession` 必须在 `emit turn:end` 之前（对 `replayEvents` 的幂等断言是它的可测代理）。
2. **重放幂等**：`turns` 含重复 id、`pending` 指向已落库 Turn 两种情况下，`turn:end` 不重复、不出现“先 end 后 start”的倒序。
3. **前端合并**：`turn:start(半句)` → `turn:delta(后半)` → 重放 `turn:start(完整)` → `turn:end`，最终只有一条且文本为完整版。

## 用户 Prompt 2

按你的方案改：
1. 连接时先订阅再重放；
2. Turn 落库后再广播；
3. 前端按 turn.id 去重；
4. 断线重连要能接上。

只改必要文件。改完运行 pnpm test，把结果贴出来。不要跑 e2e。

## AI 回复 2

先对账再动刀。四条要求里，**三条在提交版里已经成立**，所以没有为了“看起来改了”去重写正确的部分。

| 要求 | 提交版现状 | 本次动作 |
| --- | --- | --- |
| 先订阅再重放 | `routes.ts` L244 `subscribe()` → L245 `replayEvents()`，中间无 await | 顺序保留；补注释固化为契约；补 `retry: 2000` |
| 落库后再广播 | `orchestrator.ts` L156 push → L157 save → L159 `emit turn:end` | 已正确，未动 |
| 前端按 `turn.id` 去重 | `SessionRoom.tsx` L130 查 id、L148 `exists ? 替换 : 追加` | 已正确，未动 |
| 断线重连接上 | 依赖“全量重放 + 客户端 id 去重” | 把重放改成幂等，堵住“先 end 后 start”的倒序；补重连间隔 |

实际改动 2 个生产文件 + 1 个测试文件。

**`apps/server/src/engine/orchestrator.ts`**

```ts
function emit(sessionId: string, event: StreamEvent) {
  const set = listeners.get(sessionId);
  if (!set) return;
  // 广播期间订阅者集合固定
  for (const fn of [...set]) {
    try {
      fn(event);
    } catch {
      /* client disconnected */
    }
  }
}
```

```ts
export function replayEvents(session: Session, pending = getInflightTurn(session.id)): StreamEvent[] {
  const events: StreamEvent[] = [];
  const seen = new Set<string>();
  for (const turn of session.turns) {
    if (seen.has(turn.id)) continue;   // 幂等：同一 Turn 只重放一次
    seen.add(turn.id);
    events.push({ type: 'turn:end', turn });
  }
  // pending 若已落库，就不再补 turn:start，避免“先 end 后 start”
  if (pending && !seen.has(pending.turn.id)) {
    events.push({ type: 'turn:start', turn: { ...pending.turn, text: pending.text } });
  }
  events.push({ type: 'status', status: session.status, progress: session.progress });
  // ... completed 时继续补 report / done
  return events;
}
```

**`apps/server/src/routes.ts`**

```ts
// 先订阅再重放：中间的事件只会重复、不会缺失；重复由客户端按 turn.id 消掉
res.write('retry: 2000\n\n');
const unsubscribe = subscribe(session.id, send);
for (const event of replayEvents(session)) send(event);
```

**`apps/server/src/engine/replay.test.ts`**：新增 2 条用例（重复 id 只重放一次；已落库的 inflight 不发 `turn:start`），测试数 3 → 5。

没有改 `SessionRoom.tsx` / `api.ts`（去重与合并已满足要求），没有改 `store` 和 `run()` 的分片节奏，没有新增依赖。

`pnpm test` 完整输出：

```
$ pnpm --filter @cabin/server test
$ vitest run

 RUN  v2.1.9 C:/Users/28654/Documents/deepseek-harness/default-workspace/review-copies/sse/apps/server

 ✓ src/domain/analyze.test.ts (5 tests) 6ms
 ✓ src/engine/scoring.test.ts (2 tests) 3ms
 ✓ src/engine/replay.test.ts (5 tests) 3ms

 Test Files  3 passed (3)
      Tests  12 passed (12)
   Start at  17:37:31
   Duration  592ms (transform 220ms, setup 0ms, collect 567ms, tests 12ms, environment 1ms, prepare 434ms)

EXIT=0
```

12/12 全绿，退出码 0。按要求没有跑 e2e、没有起服务器、没有开浏览器。

## 用户 Prompt 3

在不启动服务器的前提下，做一次静态验收：
- 订阅/重放顺序是否有代码证据；
- 落库与广播顺序是否固定；
- 前端是否有按 turn.id 去重；
- 哪些测试覆盖了这些点，哪些仍需要 e2e 才能证明。

把结论写清楚，不要编造 e2e 通过。

## AI 回复 3

静态验收结论如下，证据只来自代码文本与单元测试，**没有一条来自运行时观察**。

### 1. 订阅/重放顺序：有代码证据，且是硬顺序

`apps/server/src/routes.ts` L243-L245：

```ts
res.write('retry: 2000\n\n');
const unsubscribe = subscribe(session.id, send);        // 先订阅
for (const event of replayEvents(session)) send(event); // 后重放
```

- 不只是“两行相邻”，而是两步之间**没有 await**：handler 同步执行到 for 结束，Node 单线程内不存在“重放时被 live emit 插队”。
- 取舍写在注释里：先订阅会让“快照后发生的事件”既被 live 推一次、又被重放带一次（重复），但重复可由 id 消解；反过来（先重放）的缺口不可恢复。
- 清理完整：`req.on('close' | 'error', cleanup)` → `clearInterval(heartbeat)` + `unsubscribe()`（L247-L256）。

结论：**成立**。可静态证明的到此为止；`retry:` 是否真的改变浏览器重连间隔属于运行时行为。

### 2. 落库与广播顺序：固定，粒度是“单条 Turn”

`orchestrator.ts` L155-L160：

```ts
turn.text = text;
live.turns.push(turn);        // 1. 进内存
live.progress = ...;
store.saveSession(live);      // 2. 同步落库（tmp + rename）
inflight.delete(sessionId);   // 3. 清 inflight
emit(sessionId, { type: 'turn:end', turn }); // 4. 广播
```

- `saveSession` 同步（`store.ts` L73-L78，`persist()` 写 tmp 再 rename），返回后才 emit。
- 边界：这是“内存 + 同步写盘”，不是事务。`persist()` 抛错时 `run()` 会打回 `ready` 并发 error，但已 push 的 Turn 不会回滚——顺序固定能保证的极限到此为止。
- 终局同理：`saveSession(final)` 在 `status: completed` / `report` 之前（L175-L183）。

结论：**成立**；原子性/崩溃一致性不在本次范围。

### 3. 前端按 `turn.id` 去重：有，且三种事件都有分支

`SessionRoom.tsx`：

- L128-L141 `turn:start`：`findIndex(t => t.id === event.turn.id)`，不存在追加；存在则用“更长文本”替换（重连后服务端文本必然 ≥ 本地，等价于以服务端为准）。
- L142-L145 `turn:delta`：按 id `map` 追加，找不到就自然丢弃，不会凭空造气泡。
- L146-L152 `turn:end`：`exists ? 替换 : 追加`，同 id 永远一条。
- L396 `key={turn.id}` + `data-turn-id`，重复 id 在 React 层也会暴露。

防线是两层的：服务端重放幂等（本次新增）+ 客户端 id 合并，任一层单独失效都不至于渲染重复。

已知残留：id 形如 `t1..t27`，只在单次 run 内唯一；`startSession` 重置后计数从 1 重来（L197），`begin()` 的 `setTurns([])`（L111）掩盖了它，跨标签页/续跑仍可能撞 id。

结论：**成立**，但 id 作用域是“单次 run”，不是“单 session”。

### 4. 测试覆盖对照：覆盖了什么，没覆盖什么

| 验收点 | 覆盖它的测试 | 覆盖程度 |
| --- | --- | --- |
| 重放顺序：已落库 `turn:end` → inflight `turn:start` → `status` | `replay.test.ts` 前两条用例 | 纯函数级，断言事件类型序列 |
| 重放幂等：重复 id 只发一次 | `replay.test.ts` 新增用例 | 纯函数级 |
| 已落库的 inflight 不再发 `turn:start` | `replay.test.ts` 新增用例 | 纯函数级 |
| completed 重放带 `report`+`done`、无 `turn:start` | `replay.test.ts` 第三条用例 | 纯函数级 |
| 订阅先于重放（handler 内调用顺序） | **无单测** | 只有代码证据（L244→L245） |
| `saveSession` 早于 `emit turn:end` | **无单测** | 只有代码证据（L157→L159）；`run()` 依赖 store/LLM/sleep 且未导出 |
| 前端 `turn.id` 去重 / 取更长文本 | **无单测** | 仓库没有前端测试工程（无 jsdom 配置的 web 测试） |
| 真实 SSE：浏览器自动重连、`retry:` 生效、代理不缓冲、心跳不中断 | **无单测** | 必须 e2e |

**必须 e2e 才能证明、本次未做的四件事**（不予声称）：

1. 质询中断网 N 秒再恢复：前端最终只有一条 Turn，文本与落库一致；
2. 质询中刷新页面：已发出的中间消息不丢不重；
3. 服务端进程重启（`store` 把 running 降级为 ready）后重连不卡在“永远 running”；
4. `retry: 2000` 与 15s 心跳在真实网络栈（含反向代理）下的行为。

明确声明：**没有启动服务器、没有跑 e2e、没有开浏览器**，上述 4 条全部“未验证”；文中所有“通过”只指 12 条单元测试。

## 验证记录

环境：Windows；Node/pnpm 使用 DSH 内置运行时；未监听任何端口。

```powershell
$env:PATH='C:\Users\28654\Documents\deepseek-harness\default-workspace\review-copies\bin;' + $env:PATH
& 'C:\...\node.exe' 'C:\...\pnpm\bin\pnpm.mjs' test
```

| 时间 | 命令 | 结果 |
| --- | --- | --- |
| 17:37:27 | `pnpm test`（管道输出） | 12 passed / 3 files；PowerShell 把 pnpm 的脚本回显当 stderr，报 `[exit code: 1]`，非测试失败 |
| 17:37:31 | `pnpm test`（分离 stdout/stderr 后取 `$LASTEXITCODE`） | **EXIT=0**；`Test Files 3 passed (3)`、`Tests 12 passed (12)`、Duration 592ms |

改动文件：

- `apps/server/src/engine/orchestrator.ts`：`emit` 遍历订阅者快照；`replayEvents` 按 id 幂等重放、已落库的 inflight 不再补 `turn:start`。
- `apps/server/src/routes.ts`：SSE 流开头补 `retry: 2000`；订阅/重放顺序加注释固定。
- `apps/server/src/engine/replay.test.ts`：新增 2 条幂等性用例（3 → 5 条）。

未做：e2e、启动服务器、浏览器验证、前端单测（仓库无此前端测试工程）。
已知限制：Turn id 在重跑时复用，跨 run 的 `turn.id` 不唯一。
