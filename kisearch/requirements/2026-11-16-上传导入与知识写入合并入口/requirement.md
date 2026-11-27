---
id: REQ-20261116-002
feature: 上传导入与知识写入合并入口
status: 实施中
created: 2026-11-16
updated: 2026-11-16
version: 4
tags: [feat, web, 导航, 信息架构]
depends_on: []
author: AI
document_type: requirement
---

# 需求：上传导入与知识写入合并为单一入口（页内双 tab）

- 需求 ID：REQ-20261116-002
- 提出日期：2026-11-16
- 状态：**已确认**（5 条拍板已落定，见 §2）
- 模式：product-manager M1 一次成型档
- 证据声明：最高 **🟢**（代码直读：导航 / 路由 / 两页组件 / CSS 断点 / 测试断言）。**未运行实测**——界面图为源码直读 + 结构推演，非截图取证；tab 条视觉观感与栅格切换跳动幅度属 `🟡`，见 §8。

## 1. 用户诉求（原话）

> 我希望吧上传导入和知识写入合并为一个tab。
> 分析一下这个需求。

用户附图：侧栏「工作空间」中相邻的两项——`⇧ 上传导入`、`✎ 知识写入`（各占一行、各带图标）。

## 2. 拍板结论（2026-11-16 用户"确认"）

| # | 决策项 | 结论 |
|---|---|---|
| ① | 合并后页名 / tab 名 | **方案 A**：页名（H1）「知识写入」，页内 tab「上传导入」「手动写入」 |
| ② | 切 tab 是否清空导入表单 | **不清空**（等同"未离开页面"）；但切回导入 tab 时要求**重新确认 Scope** |
| ③ | 两 tab 是否共享目标 Scope/Group | **各自独立**（共享会与"每次写入前重新确认目标"的安全设计冲突，且引入写错库风险） |
| ④ | 是否做导入进度徽标（R6） | **做** |
| ⑤ | 合并项图标 | 交 `ui-designer` 定（`upload` / `edit` / 新图标） |

## 3. 现状（🟢 代码直读）

```text
侧栏「工作空间」共 10 项，上传导入 / 知识写入 是两个同级入口
├─ 导航表        AppShell.tsx:67-81      两项：/import（upload）、/write（edit）
├─ 权限过滤      AppShell.tsx:245-249    两项同属 knowledge.write 能力
├─ 顶栏 H1       AppShell.tsx:369-375    H1 = 导航 label（页面身份唯一出口）
├─ 路由          routes.tsx:60-68        /import 只做能力门禁，页面由 AppShell 内联渲染；/write 正常 Outlet
└─ 常驻机制      AppShell.tsx:829-831    ImportPage 无条件挂载，display:contents|none 切换

两页布局方向相反（内部不动的方案下，切 tab 会整块换栅格）
├─ /import  主表单 1fr ｜ 右轨 380px（≥960px 右轨 sticky）  ki.css:3345-3382
└─ /write   元数据卡 380px ｜ 正文编辑器 1fr                 ki.css:3533-3536

两页共用的既有能力（合并后必须继续成立）
├─ 目标 Scope 每次确认  ScopePathSelect（ScopePathSelect.tsx:24-28 注释即「上传导入/知识写入」）
├─ Group 路径选择       GroupPathSelect
├─ Tags 下拉            /api/tags
├─ 向量化开关 + 可用性  useVectorAvailability（不可用则钳为 FTS-only）
└─ 只读库提示与置灰      lib/scopeReadonly.ts:18（原注释：「上传导入 / 知识写入共用」）
```

**关键结论**：诉求本质是**信息架构收敛**，不是功能新增。两者是同一目标的两种输入方式（文件 → 导入管线；手写单篇 → `sync-relation`），但命名不成互斥选择（一个说手段、一个说目的），用户在侧栏无法判断点哪个。

## 4. 影响面（M1 必填）

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 建议处理 | 需拍板 |
|---|---|---|---|---|---|
| 侧栏导航（10→9 项） | 展示 | 降级 | `AppShell.tsx:67-81` | 合并项保持原槽位（AI 对话之下、数据源之上） | 已拍板① |
| 顶栏 H1 ↔ tab 名 | 展示 | 降级 | `AppShell.tsx:369-375` | H1 = 「知识写入」；`/import`、`/write` 两条路径都要登记 H1 label（参考 `GOVERNANCE_LABELS`） | 已拍板① |
| 导入页常驻 + 在途轮询 | 流程 | **破坏**（若按普通路由实现） | `AppShell.tsx:829-831` | 合并容器提升到 AppShell 常驻，切 tab 用隐藏不卸载 | 否 |
| 离开页面清理口径 | 流程 | 降级 | `ImportPage.tsx:694-767`（`partial` / `uploadErrors` 保留分支必留） | "离开"重定义为离开合并页；tab 切换不清空；切回导入 tab 重新要求确认 Scope | 已拍板② |
| `/import`、`/write` 深链与站内入口 | 外部契约 | 无感 | `routes.tsx:60-68`、`BrowsePage.tsx:1000`、`TasksPage.tsx:615` | 双路由保留、由路由驱动 tab | 否 |
| 任务台账操作名「上传导入」 | 外部契约 | 无感 | `web/test/task-source-open-api.test.mjs:51-53`（明确断言不得改名） | **不改**：页面名与操作名解耦 | 否 |
| 只读 scope 提示与置灰 | 权限 | 无感 | `lib/scopeReadonly.ts:18` | 两个 tab 各自保留提示条与置灰 | 否 |
| 导入进度跨 tab 可见性 | 展示 | 降级 | 顶栏仅提示**终态**（`lib/taskNotice.ts`），无实时进度 | tab 标签加进度徽标 | 已拍板④ |
| 验证脚本 | 流程 | 破坏 | `temp/verify-r3-partial-keep.mjs`、`temp/verify-workbench-pages-v2*.cjs` 依赖 `/import` 路径与清理行为 | 随 R5 一并更新 | 否 |
| 用户文档称谓 | 展示 | 无感 | `README.md:246-247`、`docs/configuration.md:209`、`docs/cli.md:281`、`docs/mcp-http.md:115` | 文案同步 | 否 |
| 窄屏（<960px） | 展示 | 无感 | `ki.css:3348`、`ki.css:3536` 已有单列断点 | tab 条不得折行挤压 | 否 |

⚪ **未发现（需确认）**：仓库外是否有团队文档 / 书签指向 `/write`。双路由方案使其无感，不阻塞。

**后端零改动**：`/api/import/*`、`ki_sync_relation`、权限模型、任务台账语义全部不变，本次为纯前端 IA 改动。

## 5. 需求清单

| ID | 需求 | 优先级 | 验收标准（可判定） |
|---|---|---|---|
| R1 | 侧栏两个入口合并为一项，`knowledge.write` 权限过滤保留 | P0 | 读写账号侧栏「工作空间」为 9 项，仅一项承载两页；只读账号该项不可见 |
| R2 | 合并页内含页级 tab「上传导入 / 手动写入」，切换同步 URL | P0 | 点 tab 切换内容与高亮；地址栏随之变化；浏览器后退回到上一个 tab |
| R3 | 双路由兼容：`/import` 落上传 tab，`/write` 落写入 tab | P0 | 两条路径直达均正确落地；`BrowsePage` 空态与任务页「去导入」入口不改也能用 |
| R4 | 切 tab 不卸载：导入表单 / 在途轮询 / 写入正文草稿全部保留 | P0 | 导入进行中切到写入 tab 再切回，百分比继续推进、结果不丢；正文写完切走再回来内容仍在 |
| R5 | 重定义"离开清理"：仅离开合并页时按既有规则清理；`partial` 结果与 `uploadErrors` 仍保留；切回导入 tab 时 Scope 需重新确认 | P1（与 R4 同处改造，同批落地） | 现有 partial 保留场景在新结构下等价通过 |
| R6 | 导入 tab 未激活但在途时，tab 标签显示进度 | P2 | 停在写入 tab 能看到「导入中 62%」 |
| R7 | 文案与文档称谓同步；操作名「上传导入」保持不变 | P1 | README / docs 四处更新；任务台账与徽标文案不改 |

**明确不做**（本次范围外）：

- 两 tab 共享目标 Scope/Group（见拍板③）
- 写入 tab 配右轨（最近写入 / 校验）
- 合并成单表单（拖文件与粘正文自适应）——两条提交链路状态机差异过大（异步 job + 轮询 vs 同步返回），合并会引入大量条件分支，收益不抵成本

## 6. 负向需求

| ID | 场景 | 期望行为 |
|---|---|---|
| N1 | 导入进行中刷新 / 重开标签页 | tab 必须由 URL 决定，否则刷新落到默认 tab，用户看不到正在跑的导入（凭据存 localStorage，恢复逻辑在 `ImportPage` 内） |
| N2 | 新建 Scope 草稿未回车确认就切 tab | 不静默沿用旧 scope；`scopeDraftDirty` 提示在切回后仍生效 |
| N3 | 目标库为只读 | 两个 tab 各自显示只读提示条、各自置灰提交按钮 |
| N4 | 无 `knowledge.write` 权限 | 合并项整体隐藏，不出现"进得去但做不了" |
| N5 | 正文已写、切 tab / 离开再回 | 草稿不丢；任何"懒挂载"优化都必须带草稿保护 |
| N6 | 窄屏 <960px | tab 条不折行挤压页头；两 tab 内容均单列 |
| N7 | 两 tab 各选不同目标库 | 状态各自独立，A tab 的选择不得隐式改掉 B tab 的写入目标 |
| N8 | 只读库 + 在途导入 | 「进行中的导入会继续完成」提示（`SCOPE_READONLY_INFLIGHT_HINT`）在两个 tab 都说得通 |

## 7. 缺口回扫（六维）

| 维度 | 结论 |
|---|---|
| 场景完整性 | 通过：补"在途任务跨 tab"1 条 → N1、R6 |
| 验收标准可达性 | 通过：R1-R7 均给可判定验收 |
| 需求一致性 | 通过（已消解冲突）：共享目标 scope 与"每次确认目标"冲突 → 定为各自独立（拍板③ / N7） |
| 角色-需求对齐 | 通过：读写 / 只读 / 无权限三类覆盖（R1、N3、N4） |
| 边界与异常覆盖 | 通过：刷新、草稿、只读、窄屏、串号 → N1-N8 |
| 术语一致性 | 已通过（拍板①定案）：H1「知识写入」/ tab「上传导入·手动写入」/ 操作名仍为「上传导入」 |

## 8. 直观视图

> 示意图，比例与像素不精确；tab 条视觉细节待 ui-designer 定稿。

**图 1｜现状**

```text
侧栏「工作空间」共 10 项，两个同级入口
│ 总览
│ 知识库浏览
│ 语义搜索
│ AI 对话
│ 上传导入      ◀ 入口 ①：拖拽目录 → upload → preflight → run → 轮询 status
│ 知识写入      ◀ 入口 ②：手写单篇 → sync-relation（同步返回）
│ 数据源
│ 后台任务
│ 知识视图
│ 资源
```

**图 2｜合并页 · 导入 tab 激活（拍板后预期）**

```text
顶栏 H1：知识写入                                [全局 Scope ▾]
[ 上传导入 ] [ 手动写入 ]   ← 页级 tab，由 /import | /write 决定

┌────────────────────────┐  ┌────────────────────────┐
│ 导入设置               │  │ 当前任务               │
│ 拖拽区                 │  │ 进度 / 结果            │
│ 目标 Scope             │  │ 冲突 / 清理候选        │
│ Group 路径             │  │                        │
│ Tags / 同名策略        │  │ >=960px 时 sticky      │
│ 向量化                 │  │                        │
│ [ 开始导入 ]           │  │                        │
└────────────────────────┘  └────────────────────────┘
```

**图 3｜合并页 · 手动写入 tab 激活**

```text
[ 上传导入 ] [ 手动写入 ]   ← 切 tab 不卸载，草稿与在途任务保留

┌────────────────────────┐  ┌──────────────────────────────┐
│ 文档信息               │  │ 正文   [ 编辑 ] [ 预览 ]     │
│ 目标 Scope             │  │                              │
│ Group 路径             │  │   markdown 编辑区            │
│ 文档名 Relation        │  │                              │
│ Tags                   │  │                              │
│ 向量化                 │  │                              │
│ [ 保存 ]  [ 清空 ]     │  │                              │
└────────────────────────┘  └──────────────────────────────┘
```

**变更点表**

| 变更点 | 现状 | 预期 | 类型 |
|---|---|---|---|
| 侧栏入口 | 2 项（`upload` / `edit`） | 1 项（图标待定） | 修改 + 删除 |
| 页头 | 两页各有独立副标题行 | 合并页一条副标题，说明两种方式差异 | 修改 |
| tab 条 | 无页级 tab | 复用 `.ki-segmented` + `role="tablist"`（`ResourcesPage.tsx:305-325`、`ki.css:7656`） | 新增 |
| 路由承载 | `/import` 仅门禁 + AppShell 内联渲染 | 两条路径都渲染合并页并激活对应 tab | 修改 |
| 常驻容器 | AppShell 单页 `display:none` | 合并容器常驻，内部 tab 隐藏不卸载 | 修改 |
| 两页内部布局 | 相反栅格 | 各自不变（方案 A） | 保持 |
| 右轨 | 导入页专属 | 仅导入 tab 显示 | 保持 |

## 9. 优先级排序

| 优先级 | 条目 | Kano | 价值 | 成本 | 建议方向 |
|---|---|---|---|---|---|
| P0 | R1 侧栏合并 | 期望 | 高 | 低 | 直接改导航表 |
| P0 | R2 页级 tab | 期望 | 高 | 中 | 复用现有模式，不新造视觉语言 |
| P0 | R3 双路由 | 必备 | 高 | 低 | 路由驱动 tab |
| P0 | R4 不卸载常驻 | 必备 | 高 | 中 | 容器放 AppShell，别放 Outlet |
| P1 | R5 清理口径 | 必备 | 中 | 中 | 与 R4 同批改，保住 partial 分支 |
| P1 | R7 文案文档 | 必备 | 中 | 低 | 随上线同步 |
| P2 | R6 进度徽标 | 兴奋 | 中 | 低 | 形态由视觉设计定 |

## 10. 关键假设

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| A1 | "合并为一个 tab" = 侧栏一项 + 页内两个 tab，而非把两张表单合成一张 | 方向全错 | 已拍板① |
| A2 | 保留 `/import`、`/write` 两条路径 | 统一路径需迁移旧链接/文档/测试，成本 +1 档 | 已拍板（报告 §5 A2 建议项） |
| A3 | 后端零改动、任务台账操作名不变 | 需改后端文案与既有测试断言 | 已核 `task-source-open-api.test.mjs:51-53` |
| A4 | 两 tab 目标状态独立 | 共享需重做安全口径（每次确认）才能实施 | 已拍板③ |

## 11. 下一步

1. `ui-designer`：页级 tab 条视觉（复用 `.ki-segmented` 还是页级下划线样式）+ 两 tab 栅格衔接 + 图标选型，以 §8 图为基线定稿。
2. `design-craft`：技术设计（常驻容器提升到 AppShell、路由与 H1 label 登记、清理判据改造、`temp/verify-r3-partial-keep.mjs` 与 web 测试改造清单）。
3. 实施前经 `request-guard`，实施后经 `code-review`；文档称谓按团队约定（`docs/` 面向用户，不写内部实现）。

## 12. 实现记录（2026-11-16）

### 12.1 决策变更（相对 §11 计划）

用户 2026-11-16「感觉可以直接实现」→ **跳过 design-craft 与 HTML demo**，直接实施；界面方案取 `design/ui-design.md`（页级 tab 复用 `.ki-segmented`，不新增视觉语言、不新增 token）。

### 12.2 落地清单

| 文件 | 改动 |
|---|---|
| `web/src/lib/writeTabs.ts` | 新增：`writeTabFromPath` / `isMergedWritePath` / `navItemActive`（含 `also`、分段边界匹配）/ `shouldCleanupOnMergedEntry` / `shouldReconfirmScopeOnImportReturn` / `tabBadgeVisible` / `tabBadgePercentText` |
| `web/src/lib/importProgress.ts` | 新增：导入进度快照 store（`useSyncExternalStore`），供写入页一侧的 tab 条读取 |
| `web/src/components/WriteTabs.tsx` | 新增：页级 tab 条（`role=tablist`，`aria-selected` 选中态，`←/→/Home/End` 罗塔焦点，导入进度徽标） |
| `web/src/layouts/AppShell.tsx` | 导航两项合一（`{to:'/import', label:'知识写入', icon:'edit', also:['/write']}`）、`NavItem` 接口、高亮与 H1 都改用 `navItemActive`、`WritePage` 首次进入后常驻（懒挂载）、`importVisible`→`importTabVisible` |
| `web/src/router/routes.tsx` | `/write` 由渲染页面改为 `{null}` 门禁；移除 `WritePage` 引入 |
| `web/src/pages/ImportPage.tsx` | 清理触发时机由「回到 `/import`」改为「回到合并页」；切回导入 tab 时重新确认 Scope（仅终态）；按可见性渲染 tab 条；发布进度快照 |
| `web/src/pages/WritePage.tsx` | 按可见性渲染 tab 条；每次进入写入 tab 重新确认目标 Scope（正文与 Group 保留） |
| `web/src/styles/ki.css` | 新增 `.ki-page-tabs` 段（34px 高 / 14px 字 / `aria-selected` 选中态 / 徽标 3 态 / ≤640 均分），共 24 行，无新增 token |
| `web/test/write-merge-tabs.test.mjs` | 新增 18 例：tab 判定、侧栏高亮（含分段边界）、清理时机、重确认阶段全集、徽标可见性 |
| `README.md`、`docs/configuration.md`、`docs/cli.md`、`docs/mcp-http.md` | 页面称谓按「知识写入（上传导入 / 手动写入）」统一 |

### 12.3 验证

| 项 | 结果 |
|---|---|
| `cd web && npm test` | **1211 / 1211 通过**（含新增 18 例） |
| `cd web && npx tsc --noEmit` | 本次改动文件 **0 错**；全仓被另一任务的在途改动 `web/src/chat/PromptConfigLayer.tsx`（+213 行，非本需求）阻断 |
| 真机走查（Playwright，`/tmp/verify-merge-tabs.mjs`） | **24 / 24 通过**：侧栏 9 项 / 两条路径 H1 与 tab 选中态 / 侧栏高亮 / 浏览器后退 / 正文草稿保留 / 切 tab 不清空导入表单 / 离开合并页仍按 R3 清空 / 窄屏均分不折行无溢出 / 宽屏双栏 820+380 / 控制台 0 错误 |

### 12.4 过程中发现并修复的缺陷

**（1）页级 tab 条双实例**：两个面板都按 `location` 渲染 tab 条 → 在 `/write` 上同时存在 2 个 `aria-selected="true"` 与重复 `id`；键盘 `←/→` 的 `getElementById` 会命中 `display:none` 子树，焦点丢失。改为**仅可见页渲染** tab 条。

**（2）页级 tab 条被父级 grid 拉伸成全宽**（用户截图反馈）：`.ki-content-inner` 是单列 grid，grid item 默认 `justify-self: stretch`，导致 tab 条铺满整页、右侧一大片空白。修 `justify-self: start` + `width: fit-content` + `max-width: 100%`，窄屏 media query 显式覆盖回 `stretch / 100%`。实测 1440 下由整页宽收到 178px（父容器 1212px），390 下 286px 均分。同类问题在对话配置模态框已出现过一次（`.ki-chat-cfg__seg` 被 flex 列拉伸），已单独记入错误库作为通用判据。

### 12.5 已知遗留

- `web/src/chat/PromptConfigLayer.tsx`、`web/src/pages/EventsPage.tsx` 的在途改动使全仓 `npm run tsc`/`npm run build` 变红（错误全在这两个文件），**不在本需求范围**；待其修复后复跑即可转绿。
- 导入进度徽标的「真实在途任务」场景未实测（需真实导入任务），已由「ImportPage 仍无条件挂载 + 徽标判据单测」静态保障。
- 切 tab 往返会要求重新确认目标 Scope（拍板②的对称落地）——多一步操作，属安全换便利的取舍；如需放宽，只改 `shouldReconfirmScopeOnImportReturn` / 写页对应 effect 的触发条件即可。

> 修正（auto-review 自查发现）：初版曾写「`temp/verify-r3-partial-keep.mjs` 需把导航目标从 `/write` 改成 `/browse`」——**该结论有误**：脚本实际切到 `/tasks`（`grep` 复核 `temp/verify-r3-partial-keep.mjs:104/134/149`），本就落在合并页之外，"离开合并页才清理"语义下行为不变，脚本无需修改。
