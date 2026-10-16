---
id: REQ-20261014-002
feature: 文档内搜索与命中导航
status: 实施中
created: 2026-10-14
updated: 2026-10-14
version: 1
tags: [feat, ux]
author: AI
document_type: review
---

# 🐞 排查报告：文档内查找输入 `context` 显示「未找到」（实施后回归缺陷）

- **触发**：用户报告「context 内容命名存在，为什么没有找到」+ 截图（输入框 `context` + 「未找到「context」」+ ↑↓ 禁用）
- **排查方式**：只读 Playwright 复现 + DOM 白盒口径比对（复刻 `applyDocumentHighlights` 的文本节点收集规则）+ 分阶段状态 dump
- **结论**：**两个独立缺陷叠加**，均已修复并回归（端到端 48/48、单测 247/247）

---

## 现象

k8s 文档（「04-kind集群的排障与坑」等）里用文档内查找输入 `context`：正文可见大量 `context`，界面却显示「未找到「context」」，上下跳按钮禁用。

## 证据链（全部为运行时证据）

| # | 证据 | 结论 |
|---|------|------|
| 1 | 1440px 与 620px 两种视口、3 篇候选文档、检索入口直接搜 `context` → 均正常（`1/16` / `1/8` / `1/30`） | **不是视口或候选文档问题** |
| 2 | 白盒比对：可匹配文本 46 处、被排除容器（svg/button/aria-live）0 处 | **不是排除规则问题** |
| 3 | 复现脚本（`temp/repro-cancel-then-find.cjs`，修复前输出）见下 | 命中两条独立路径 |

```
[1 打开文档（外部词 context）] marks=46  旧高亮条 1/46
[2 点「取消高亮」]            marks=0
[3 Ctrl+F 打开查找框]         inputValue="context" status="未找到「context」" marks=0 prevDisabled=true   ★与用户截图一致
[4a 输入 contex]              1/46  marks=46        ← 输入能恢复
[4b 输入 context]             「未找到」 marks=0    ★第二缺陷暴露（更完整的词反而 0）
[5   Esc 关闭再 Ctrl+F]       仍「未找到」
```

## 直接原因

1. **缺陷 A（预填不恢复高亮开关）**：查找框展开时的 seeding effect 只 `setFindDraft` / `setFindApplied`，**未** `setHighlightEnabled(true)`。若用户此前点过「取消高亮」（`cancelHighlights` 置 `false`），核心 effect 走 else 分支执行 `clearDocumentHighlights + setHighlightCount(0)` ⇒ 正文有词却显示「未找到」。
2. **缺陷 B（高亮碎片累积）**：匹配是**逐文本节点**做的；`clearDocumentHighlights` 只把 `mark` 的子节点**原样插回、不合并相邻文本节点**。搜过 `contex` 之后，正文里的 `context` 变成 `"contex"` + `"t"` 两个相邻文本节点 ⇒ 再搜 `context` 两个碎片都匹配不到 ⇒ 0 命中，且**重新输入无法自愈**（碎片只会越积越多）。

## 根本原因

- **A**：新增「查找」入口时把 `highlightEnabled` 与「生效查找词」当成两个独立状态，遗漏了「有词即应高亮」的耦合（边界未考虑）。
- **B**：复用既有「逐文本节点包裹」内核把**一次性外部高亮**扩展为**连续交互式查找**时，未考虑多次应用的幂等性 —— `clear` 不是 `apply` 的逆操作（还原了内容，没还原节点结构）。R12 阶段只评估了「跨节点关键词」，漏掉了「自己制造跨节点碎片」这条路径。

## 根因树

```text
输入 context 显示「未找到」，正文却有 46 处 context
  ▼
count=0（核心 effect 的 else 分支清零 / apply 返回 0）（证据：复现脚本 4 阶段 dump）
  ├─ A 预填外部词时不恢复 highlightEnabled（证据：3 步复现；点过「取消高亮」后必现）
  └─ B clear 不合并相邻文本节点 ⇒ 词被前一次高亮切成碎片（证据：4a 命中 46 → 4b 变 0）
  ▼
「查找」被实现为「同一门词表反复 apply」，而 clear 只还原内容、不还原节点结构（边界未考虑）
  ├─ 触发条件 1：用户点过「取消高亮」后打开查找框（A）
  └─ 触发条件 2：用户逐字输入（c → co → con → …）或输入更长的同前缀词（B）
  ▼
引入点：本次新增的文档内查找（REQ-20261014-002 实施）
```

## 修复（最小）

1. `clearDocumentHighlights`：记录被 `mark` 触碰的父节点，清完后逐一 `normalize()` 合并相邻文本节点（只合并文本，不改元素结构）。
2. 查找框 seeding effect：预填外部词时同时 `setHighlightEnabled(true)`。

## 回归验证

- 复现脚本 `temp/repro-cancel-then-find.cjs`：第 3 步 `未找到` → **`1/46`**；第 4b 步 `未找到` → **`1/46`**；第 5b 步 → `1/46`
- 端到端 `temp/verify-doc-inner-search.cjs` **48/48**（新增 H 节：H1 逐字输入 7 步后命中 46 且计数一致、H2 取消高亮后打开查找框恢复命中）
- web 单测 **247/247**；`tsc` 0 错；`vite build` 通过

## 影响面判断（修复边界）

- `clearDocumentHighlights` 是 `ModuleDrawer` 内**私有函数**（未导出，调用方仅同文件 2 处：`applyDocumentHighlights` / 取消高亮路径）⇒ 影响面封闭在该组件内。
- `normalize()` 只合并相邻文本节点；被 `replaceWith` 换掉过的文本其 React 引用本已失效，故不新增风险。
- 全仓 grep 确认无其他调用方。

## 关联产物

| 类型 | 路径 |
|---|---|
| 根因复现脚本 | `temp/repro-cancel-then-find.cjs` |
| 正式回归断言 | `temp/verify-doc-inner-search.cjs` H 节（H1/H2） |
| 截图 | `temp/shots/repro-cancel-then-find.png` |
