# Prompt 链索引

本目录记录「答辩预演舱」从赛题到可运行系统的 5 个核心迭代。  
每个文件包含：人类输入 → AI 产出 → 翻车现场 → 人工纠偏 → 修复 → 验证 → 复现方式。

| # | 迭代 | 关键 Bug / 决策 | 对应提交 |
| --- | --- | --- | --- |
| 01 | [选题收敛](01-scope.md) | 从“通用 Agent 平台”收敛到“答辩预演舱” | `docs/00-scope` |
| 02 | [材料解析与论点抽取](02-material-parser.md) | 年份被清洗正则吃掉；核心创新句被数据论点挤出 | `feat/claim-parser` / `fix/claim-parser` |
| 03 | [多 Agent 编排与 SSE](03-orchestrator.md) | EventSource 晚建导致丢消息；刷新重复 Turn | `feat/orchestrator` / `fix/sse-replay` |
| 04 | [评分校准与风险去重](04-scoring.md) | 证据强度被扣到 42；三条同名风险与 P0 重复 | `feat/scoring` / `fix/scoring-calibration` |
| 05 | [可复现构建](05-build.md) | pnpm junction、esbuild 双版本、.bin 失效 | `fix/reproducible-build` |

## 说明

- 这些文件是对本次开发会话的**结构化还原**：保留了真实指令、关键 AI 输出、报错原文与修复 diff；不是聊天工具的逐字导出。
- 对应的可视化版本在应用内 `/making-of` 页面，可用于演示视频的“AI 协同过程复现”段落。
- 每个 Bug 都能在 Git 历史中找到对应提交；每个决策都能在代码中找到落点。

## 如何验证

```bash
git log --oneline --reverse
pnpm test
pnpm build && pnpm start
```
