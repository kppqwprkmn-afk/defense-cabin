# 测试报告

> 环境：Windows 11 · Node 24.16 · pnpm 11.28.5 · Chrome Headless 143  
> 日期：2026-11-02

## 1. 单元测试

```bash
pnpm test
# 或
cd apps/server && node ../../node_modules/vitest/vitest.mjs run
```

结果：

```text
✓ src/domain/analyze.test.ts (5 tests) 14ms
✓ src/engine/scoring.test.ts (2 tests) 8ms

Test Files  2 passed (2)
Tests       7 passed (7)
```

覆盖点：

| 测试 | 断言 |
| --- | --- |
| 年份保留 | “2025 年”在清洗后原样保留 |
| 创新句入榜 | 含 92.4% 的句子被抽取，且带 `no_baseline` |
| promise 兜底 | 至少一条承诺句进入质询清单 |
| 体检边界 | 分数 ∈ (30, 94]；8 个覆盖项 |
| BM25 | 查询命中“47 间实验室”段落 |
| 风险去重 | 风险标题无重复；修订项无重复 |
| 分数边界 | 总分 50–90；单维 48–93 |

## 2. 端到端测试（Playwright）

```bash
pnpm e2e
```

测试流程：

1. 在 8790 端口启动一个独立数据目录的服务；
2. `POST /api/demo` 创建示例项目与演练；
3. 浏览器打开首页 → 进入演练 → 点击“开始交叉质询”；
4. 等待 27 轮完成；
5. 校验 turns ≥ 20、risks > 0、revisions > 0；
6. 打开报告页，确认“风险清单/修改清单”渲染；
7. 收集 console error，必须为 0。

结果：

```json
{
  "ok": true,
  "turns": 27,
  "risks": 6,
  "overall": 71
}
```

- console error：0
- 报告页正常渲染
- 独立数据目录：`apps/server/data-e2e/`（已 gitignore）

## 3. 构建验证

```bash
pnpm build
pnpm start
curl http://127.0.0.1:8787/api/health
```

| 项 | 结果 |
| --- | --- |
| TypeScript（server / web） | 通过 |
| Vite build | 1602 modules；CSS 49.2 kB；JS 239.2 kB |
| tsup | `dist/index.js` 65.8 kB |
| 单进程启动 | 正常，静态资源 + API 同源 |
| `/api/health` | `{ ok: true, mode: "mock" }` |

## 4. 演示数据

- 标准模式：27 轮；高压模式：31 轮
- 示例项目综合分：71
- 风险：6 条（5 高 / 1 中）
- 修订项：6 条（P0 ×5，P1 ×1）
- 质询覆盖：基线、因果、成本、原创、复现、样本、承诺、佐证

## 5. 视频与文档

| 产物 | 校验 |
| --- | --- |
| `video/答辩预演舱-演示视频.mp4` | 1920×1080 / 30fps / H.264 + AAC / 5:22 |
| `docs/technical-report.pdf` | 26 页 / 3.4MB / A4 |
| `screenshots/` | 7 张，1440×900 @2x |

## 6. 已知未覆盖

- 未做多用户并发压测（单进程 JSON 存储，设计边界内）。
- 未做扫描版 PDF OCR。
- 真实 LLM 模式需要外部 Key，CI 中未自动测试；失败会回退 mock。
