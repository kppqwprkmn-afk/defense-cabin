# 提交清单 · 答辩预演舱

> 用途：按赛规逐项核对，避免漏交。  
> 状态：**作品包已完成**；标 ⚠️ 的 4 项需要参赛者本人补填/确认（涉及身份与真实性，AI 不代填）。

## 一、赛规材料对照

| 赛规要求 | 本包对应文件 | 状态 |
| --- | --- | --- |
| 代码仓库（GitHub/Gitee，Public） | 当前目录，已初始化 Git（16+ 次提交） | ⚠️ 需推送到你的账号并设为 Public |
| 完整细粒度 Git 提交历史 | `git log --oneline --reverse` | ✅ 二十余次模块级提交 |
| AI 对话历史 / Prompt 快照（≥3 个核心迭代） | `docs/prompts/01-scope.md` ~ `05-build.md`（5 个） | ✅ 结构化还原；⚠️ 建议附工具原始截图 |
| README 10 分钟复现指南 | `README.md` 第 3 节 | ✅ |
| 环境配置 / 依赖清单 / 环境变量模板 | `.env.example`、`pnpm-lock.yaml`、`package.json` | ✅ |
| 演示视频（5–8 分钟，MP4 1080p） | `video/答辩预演舱-演示视频.mp4` | ✅ 约 5 分 22 秒 |
| 视频含 ≥2 分钟 AI 协同过程复现 | 03:10–05:13 `/making-of` + Prompt 链 | ✅ |
| 技术文档 PDF（≤30 页） | `docs/technical-report.pdf` | ✅ 26 页 / 3.4MB |
| 原创性 / 非开源包装 | 从 0 编写；依赖均为公开基础库 | ✅ |
| 真实问题 / 完整闭环 | 答辩材料 → 质询 → 报告 → 再练 | ✅ |
| 组别选择（研究生/A/B/C） | 以报名系统为准 | ⚠️ 按学籍选择，选错无条件取消资格 |

## 二、需要你补的 4 件事

1. **仓库地址**：推到 GitHub/Gitee，Public；把链接填进提交系统。
2. **身份信息**：报名姓名、学校、组别、指导教师（如有）；技术文档封面可加一行。
3. **原始 AI 对话导出**：`docs/prompts/` 是结构化还原；若工具支持导出，请把原始 JSON/HTML/截图放进 `docs/prompts/raw/`，更有说服力。
4. **视频旁白（可选）**：当前为 TTS。若赛规要求选手本人讲解，按 `docs/demo-video-script.md` 重录，替换音轨即可。

## 三、文件清单

```text
defense-cabin/
├─ README.md                      # 10 分钟复现 + 架构 + 评审对标
├─ SUBMISSION.md                  # 本文件
├─ LICENSE
├─ .env.example
├─ package.json / pnpm-lock.yaml
├─ apps/
│  ├─ server/                     # Express + SSE + 解析 + 编排 + 评分
│  └─ web/                        # React + Vite + 自建设计系统
├─ packages/shared/               # 前后端共享类型
├─ docs/
│  ├─ technical-report.pdf        # 26 页技术文档
│  ├─ technical-report.html       # 可重新生成 PDF 的源文件
│  ├─ architecture.md
│  ├─ competition-mapping.md
│  ├─ demo-video-script.md
│  └─ prompts/                    # 5 个 Prompt 链
├─ samples/                       # 示例申报书
├─ screenshots/                   # 7 张演示截图
├─ scripts/                       # 截图 / E2E / PDF / 视频
└─ video/                         # 演示视频成片
```

## 四、提交前 5 分钟自检

```bash
# 1. 干净安装与构建（模拟评委）
rm -rf node_modules
pnpm install
pnpm build

# 2. 启动
pnpm start
# 打开 http://127.0.0.1:8787 → 载入示例 → 开始 → 查看报告

# 3. 单元测试 + E2E
pnpm test
pnpm e2e

# 4. 检查 Git 历史不是“一次性提交”
git log --oneline --reverse | wc -l

# 5. 检查视频/文档
# video/答辩预演舱-演示视频.mp4   （5–8 分钟，1080p）
# docs/technical-report.pdf       （≤30 页）
```

## 五、口径与边界（答辩时可能被问）

- **示例项目是虚构的**：不涉及任何真实学校数据；产品支持上传真实材料。
- **评分不是奖项预测**：是风险折算与演练参考；每条扣分都能回跳论点。
- **Mock 不是假数据**：是确定性规则导演，保证无 Key/断网可复现；真实 LLM 为可选增强。
- **Prompt 记录是结构化还原**：保留真实指令、报错与修复，不是聊天工具逐字导出；如需原始记录请补 `raw/`。

## 六、组别提醒

| 你的身份 | 只能报 |
| --- | --- |
| 研究生 | 研究生组 |
| 985/211 本科生 | A 组或研究生组 |
| 非 985/211 普通本科 | B 组或更高 |
| 高职高专 | C 组或更高 |

报名时以学籍为准；组别选错会被无条件取消资格，这一项 AI 不能替你判断。
