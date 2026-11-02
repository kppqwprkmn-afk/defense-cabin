# Prompt 链 · 04 评分校准与风险去重

> 时间：2026-11-02  
> 阶段：报告可信度  
> 对应提交：`feat/scoring`、`fix/scoring-calibration`

## 1. 人类输入

```text
第一版报告给示例项目 66 分、证据强度 42，风险清单里还有三条同名
“缺少基线”。这个结果不可信，评委会觉得模型在乱扣分。

重做扣分模型：
1. 同一维度最多扣 18 分，避免一个缺口把整维打到地板；
2. 风险按标题去重，修改清单不能重复；
3. 每条风险必须能回跳到一条具体论点；
4. 修改清单带 P0/P1/P2、工作量、预计提分。
```

## 2. AI 产出

- 五维：创新性 22%、可行性 22%、证据强度 26%、表达清晰度 14%、合规与复现 16%。
- 风险映射：7 类 issue → 5 个维度；高风险 / 中风险 / 低风险。
- 扣分：高 7 / 中 4 / 低 2，单维封顶 16 分。
- 去重：`risks.some(r => r.title === TITLE_OF[issue])`；修订项再按 title 去重。
- 修改清单：`REVISION_OF[issue]` 提供动作、说明、工作量、预计提分；无映射时用风险 detail 兜底。

## 3. 翻车现场

第一版：

```text
综合得分 66
证据强度 42
风险清单：
  [高] 量化结论缺少基线
  [高] 量化结论缺少基线
  [高] 量化结论缺少基线
P0：补齐基线对照与置信区间
P0：补齐基线对照与置信区间
P0：补齐基线对照与置信区间
```

原因：三个不同 claim 都命中 `no_baseline`，每条都生成一条同名风险；修改清单又从风险 1:1 映射，于是三连重复。

同时，所有高风险直接累加扣分，证据强度从 72 被扣到 42，整体分被拖到 66，报告读起来像“判死刑”。

## 4. 人工纠偏

```text
同一维度最多扣 18 分；风险按标题去重；修改项按 title 再去重一次。
示例项目应该落在 70–72 分：有真实试点，但证据链不完整。
42 分的“证据强度”会让评委觉得工具本身不可信。
```

## 5. 修复

```diff
- const PENALTY = { high: 9, medium: 5.5, low: 3 };
+ const PENALTY = { high: 7, medium: 4, low: 2 };
```

```diff
- value -= PENALTY[risk.level];
+ deducted += PENALTY[risk.level];
+ value -= Math.min(16, deducted);
```

```diff
+ if (risks.some((r) => r.title === TITLE_OF[issue])) return;
```

```diff
+ .filter((r) => {
+   if (usedRevisions.has(r.title)) return false;
+   usedRevisions.add(r.title);
+   return true;
+ })
```

## 6. 验证

- 示例项目：71 分；证据强度 60；合规与复现 61；6 条风险（5 高 / 1 中）；6 条修改项，无重复。
- 单测：`new Set(titles).size === titles.length`，分数在 48–93 之间。
- 报告页 6 张风险卡、6 条修订项一一对应不同标题。

## 7. 复现

```bash
pnpm --filter @cabin/server test
# 打开 /report/:id 查看风险清单与修改清单
```
