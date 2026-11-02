export interface BuildStep {
  id: string;
  index: string;
  title: string;
  tag: string;
  prompt: string;
  output: string;
  bug?: string;
  fix?: string;
  commit: string;
  files: string[];
}

export const BUILD_STEPS: BuildStep[] = [
  {
    id: 'scope',
    index: '01',
    title: '把赛题收敛成一个可演示的产品',
    tag: '意图对齐',
    prompt:
      '这是全国高校 Vibe Coding 挑战赛的完整赛题。先不要写代码：判断你能否独自完成，指出哪些部分必须我来做，然后给出一个能在 5 分钟内演示清楚、同时覆盖“多 Agent + RAG + 高交互可视化”的选题。',
    output:
      'AI 先否定了“通用 Agent 平台”这种大而空的方案，把范围收敛到「答辩预演舱」：上传申报书 → 三位评审交叉质询 → 风险雷达与修改清单。它同时明确：报名、真实 API Key、选手本人的 AI 对话记录不能由它代做。',
    commit: 'docs/00-scope',
    files: ['docs/prompts/01-scope.md'],
  },
  {
    id: 'parse',
    index: '02',
    title: '让材料“可被质询”，而不只是被总结',
    tag: 'RAG / 抽取',
    prompt:
      '不要做通用摘要。把申报书拆成“可质询论点”，每条要有：类型、证据强度、缺口标签（缺基线/缺样本/因果混淆/承诺性指标/无出处）。用规则实现，保证离线可复现。',
    output:
      'AI 产出 analyze.ts：按章节切块、正则+权重抽取 12 条论点、BM25 建索引。第一次跑示例材料时，所有句子开头的年份都被吃掉了。',
    bug: '“2025 年 9 月……” 被清洗成 “年 9 月……”。根因是 sentences() 里的前置清洗正则把任意开头数字都当成列表序号。',
    fix: '把清洗规则收紧为「1–2 位数字 + . 或 、」的列表标记，保留四位数年份；同时把“提出…框架”的权重从 5 提到 14，避免核心创新点被四条数据论点挤出前 12。',
    commit: 'fix/claim-parser',
    files: ['apps/server/src/domain/text.ts', 'apps/server/src/domain/analyze.ts'],
  },
  {
    id: 'orchestra',
    index: '03',
    title: '多 Agent 不是四个聊天框，而是一条有状态的质询链',
    tag: '编排 / SSE',
    prompt:
      '设计一条 20 轮左右的质询链：主持人开场 → 方法学教授追问基线 → 答辩人应答 → 追问 → 产业评委问成本 → 竞赛评审问复现 → 独立裁决。用 SSE 流式输出，刷新页面不能丢记录。',
    output:
      'AI 把“说什么”与“怎么播”拆开：script.ts 生成确定性剧本，orchestrator.ts 负责逐字流、持久化、断线重放。每个 Turn 带 claimId，前端据此高亮论点、挂载证据。',
    bug: 'EventSource 在 POST /start 之后才建立，前几条消息会丢；刷新时又可能重复插入同一 Turn。',
    fix: 'SSE 连接时先 subscribe 再 replay 已落库的 turns；前端按 turn.id 去重，turn:end 覆盖同 id 的流式占位。刷新后从 db.json 恢复完整现场。',
    commit: 'feat/orchestrator',
    files: ['apps/server/src/engine/orchestrator.ts', 'apps/server/src/engine/script.ts'],
  },
  {
    id: 'score',
    index: '04',
    title: '评分要锋利，但不能把早期项目一棍打死',
    tag: '评分 / 校准',
    prompt:
      '第一版报告给示例项目 66 分、证据强度 42，风险清单里还有三条同名“缺少基线”。这个结果不可信。重做扣分模型：同一维度最多扣 18 分，风险按标题去重，修改清单不能重复。',
    output:
      'AI 把高风险扣分从 9 降到 7、中风险 5.5→4，并给每个维度加 18 分扣分上限；风险与修改项按标题去重。示例项目回到 70–71 分，证据强度 58，报告从“判死刑”变成“可执行的补证清单”。',
    bug: '去重前，三条不同论点共用同一个 issue 标题，导致右栏和 P0 清单重复出现三次“补齐基线对照”。',
    fix: 'buildReport 内维护 seenTitle；修订项再做一次 title 去重，并保留 claimId 供回跳。',
    commit: 'fix/scoring-calibration',
    files: ['apps/server/src/engine/scoring.ts'],
  },
  {
    id: 'build',
    index: '05',
    title: '让评委在 10 分钟内跑起来',
    tag: '工程 / 复现',
    prompt:
      '当前 Windows 环境下 pnpm 的 junction 让 Vite 找不到 rollup/picomatch，esbuild 还出现 0.25 与 0.27 双版本冲突。给出一个不依赖本机全局安装、评委可复现的构建方案。',
    output:
      'AI 先把 node-linker 切到 hoisted，绕开 junction 解析；再把 package scripts 改成直接调用 node_modules 内的 tsc/vite/tsup，避免 .bin shim 指向失效虚拟路径。最终 `pnpm build` 与单进程 `pnpm start` 均可复现。',
    bug: 'hoisted 安装后 .bin/tsc 仍指向旧的 .pnpm/typescript@5.9.3 路径，构建报 MODULE_NOT_FOUND。',
    fix: '脚本改为 node ../../node_modules/typescript/bin/tsc 等绝对入口；tsconfig 去掉 composite，web 构建改为 tsc --noEmit && vite build。',
    commit: 'fix/reproducible-build',
    files: ['package.json', 'pnpm-workspace.yaml', 'apps/web/package.json'],
  },
];
