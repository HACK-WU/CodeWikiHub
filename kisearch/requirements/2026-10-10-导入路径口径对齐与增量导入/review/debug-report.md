# 排错报告：同一目录二次导入未跳过、文档翻倍、表单跨页残留

- **日期**：2026-10-10
- **需求**：REQ-20261010-001（导入路径口径对齐与增量导入）
- **范围**：只读排查 + 最小复现 + 一处前端修复（Q4 表单重置）；导入核心产品代码**未改动**
- **证据等级**：🟢（运行时实测 / 磁盘实读 / 代码直读）；无 🔴 结论

---

## 1. 现象

| # | 现象 | 来源 |
|---|---|---|
| 1 | 第二次导入同一目录（选定「跳过同名文件」）后，进度仍 `15000/15594 个处理单元`，几乎与首次相同 | 用户截图 1 |
| 2 | 文档列表 `AGENTS` 与 `AGENTS_1` 并存，总数 **3741 篇**（翻倍） | 用户截图 2 |
| 3 | 从其他 tab 切回导入页，页面仍填着上次导入时输入的 Scope / 同名策略 | 用户截图 3 |

---

## 2. 证据链（全部实证）

| # | 证据（来源） | 结论 |
|---|---|---|
| E1 | `.ki-data/.ki-tasks/b7ad6830-34dd-4623-b97b-ccb5f0c178e0.json`：`createdAt` 10:07:37、`state=partial`、`partialCommitted=398`；`<scope>/.ki-import-incomplete.prev.json` 记 `params.conflictMode="suffix"`、`sourceDir=/root/.ki/import-uploads/5dc1bb75-…` | 首次导入为默认 suffix，中途失败 |
| E2 | `.ki-data/.ki-tasks/9aab7658-596e-4038-9eac-8717ca4f7160.json`：10:08:23 → 10:14:13、`state=succeeded`、`partialCommitted=15594` | 截图 1 的 `15594` 就是这一次 |
| E3 | `.ki-data/ai-docs/.relations/**/cache.json` 全量读取：3741 条 = 扁平 1859（`saas-backend-datalink`1217 / `aiops`348 / `log-platform`191 / `product`65 / `apm-rum`30 / `bots`6 / 组 `ai-docs` 内 2）+ 嵌套 1884（组根 `ai-docs`）；**1857 条与扁平同名组一一同名** | 「翻倍」的构成 |
| E4 | `relations-cache.json.bak`（旧单文件布局备份，`updatedAt` **10-10 09:54**，早于 10:07）：633 组 / 1859 条 / **0 个嵌套组** | 老副本在本次导入前已存在 |
| E5 | `/root/.bash_history`：`ki import -s ai-docs --source ./ai-docs/`（源目录 `/root/ai-docs`，Sep 30 10:47 克隆，导入时间与 KB 目录 mtime 10:49 吻合） | 老副本来自 **CLI 扁平导入** |
| E6 | 组 `ai-docs` 的 `cache.json`：`AGENTS`→`sourcePath=AGENTS.md`；`AGENTS_1`→`sourcePath=ai-docs/AGENTS.md` | 同组同名两份，`_1` 由 E1 那次 suffix 生成 |
| E7 | 暂存目录实读：`/root/.ki/import-uploads/{5dc1bb75,e37624d7,0088f3a1}/ai-docs/…`，三次 Web 上传的 `.upload-session.json` 里错误条目也是 `ai-docs/...` 形态 | Web 入口的 rel **带被选目录名** |

---

## 3. 最小复现（`temp/repro-import-skip.ts`，FTS-only 隔离 scope）

| 实验 | 预期 | 实测 |
|---|---|---|
| R1 扁平目录导入（等价 CLI） | 组 `sub` 与组=scope 名 | 2 篇 ✓ |
| R2 同一目录带前缀再导入（suffix） | 复刻生产 | 5 篇：`foo`+`foo_1`；`sub/x` 落成 **`sub` 与 `<scope>/sub` 两份**；处理单元 3/3 |
| R3 同一目录再导一次（skip） | 复刻"跳过没生效" | **冲突 0 条 / skip 0 条 / 处理单元仍 3/3** |
| C2 对照：新 scope 首次 skip 导嵌套目录 | 证明跳过逻辑本身正常 | **skip=1、处理单元 3→2** |

---

## 4. 根因

```text
{进度不降 + 文档翻倍 + 跳过"没生效"}
  ▼
{1884 篇被当全新文档写入新组树 ai-docs/*；skip 一次未触发}
  ▼
{同一物理目录两种入口的 rel 起点不同}   ← 根因
  ├─ Web（拖拽/目录选择器/webkitdirectory 回退）：`<目录名>/…`（ImportPage.tsx:914 / :834 / :787）
  └─ CLI 与「选择文件」：扁平
  ▼
{groupPath 与 sourcePath 双双错位}
  ├─ `dirname(rel) || scope`（src/lib/import.ts:249-256）：`aiops` vs `ai-docs/aiops` ⇒ 不构成同名冲突
  └─ `sourcePath` 不同 ⇒ `src/lib/import-conflict.ts:64-67` 的幂等覆盖分支不命中
```

**skip 的适用面**只有「同一个 Group 内、不同 `sourcePath` 的同名文档」；本次 1882 篇落点组不同（无冲突）、2 篇命中同 `sourcePath` 幂等覆盖（优先级更高）⇒ 策略全程无机会执行。**结论：非传输 Bug**（`plan.finalize.conflictMode` → `/api/import/upload`(finalize) → `/api/import/run` 逐段核对，`test/mcp-http-api.test.ts:678` 有契约测试）。

**附带发现（同批重复 rel）**：同批内两条 rel 相同时，第二条命中同一个幂等覆盖分支 ⇒ 静默覆盖；`relation.memoryIds` 只回填后者（`src/lib/import.ts:1535-1544`），**前者的 chunk 向量留在库里、可被检索但无 relation 归属**（孤儿向量）。剥离顶层段后「多目录同拖」会走这条路径，故 R2 为 R1 的前置。

---

## 5. 本次实施（Q4：表单重置边界）

| 文件 | 改动 |
|---|---|
| `web/src/pages/ImportPage.tsx` | R3 的"高级参数属偏好保留"边界反转：离开导入页再回来（终态分支）清空 Scope / Group / 同名策略 / 后缀 / tags / 切分参数 / 向量化开关；部分成功分支仍保留 scope 与 uploadId（重试入口依赖）；新增 `formEpoch` 作为 `ScopePathSelect` 的 key |
| `web/src/components/ScopePathSelect.tsx` | 补注释：输入框显示的是组件内部 `scopeFilter`，父组件置空 `value` **不会**清掉框里的字，需变更 `key` 重建 |

**踩坑（值得记）**：首版在子组件内加「value/confirmed 变空即同步清空内部输入」的 effect —— **无效**。用户"只输入未确认"时父组件的 `value/confirmed` 本就是空，清空不构成状态变化、effect 不触发，残留文本照旧（正是截图 3 的状态）⇒ 外部"重置"必须是**事件**（key 重建），而不是**值跃迁**。

**验证（实跑）**：
- `temp/verify-import-form-reset.cjs`（Playwright + daemon 7423 真实页面）**15/15**：场景 A（点选 Scope=ai-docs + Group + skip + chunk 2000 + tag → 切 tab 回来全部清空、页头回「请选择并确认本次导入的 Scope」）；场景 B（只输入未确认也被清空）；console 0 错误；截图 `temp/shots/import-form-{before,after}.png`。
- web `npm test` **61/61**、`npm run build`（tsc + vite）通过。
- 走查脚本踩坑：Group 下拉面板展开时遮挡下方字段，Playwright 点击被拦截 → 先点页面空白收起面板；Scope 列表项用 `dispatchEvent('click')` 绕过命中测试。

---

## 6. 未做 / 待办

| # | 项 | 说明 |
|---|---|---|
| 1 | R1 剥离、R2 判定修正、R3 增量导入、R5 文案同步 | 见 `requirement.md` §3，待拍板 Q1~Q3 后实施 |
| 2 | 存量 1857 对重复文档 | 用户拍板**不处理**（D5）；现状：`ai-docs` 检索会召回同内容两份，向量存储翻倍 |
| 3 | 跨版本重试兼容 | 同一 uploadId 内自洽（暂存文件名与清单同批）；旧 uploadId + 新客户端属新批次语义，无破坏 |
| 4 | daemon 重启 | Q4 为前端改动，重建 `web/dist` 后免重启即生效（已构建验证） |

---

## 7. 相关产物

| 产物 | 路径 |
|---|---|
| 最小复现脚本 | `temp/repro-import-skip.ts` |
| 走查脚本（表单重置） | `temp/verify-import-form-reset.cjs` |
| 遮挡探针 | `temp/probe-scope-panel-overlap.cjs` |
| 截图 | `temp/shots/import-form-{before,after}.png`、`temp/shots/probe-scope-panel.png` |
