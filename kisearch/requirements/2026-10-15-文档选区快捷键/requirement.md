# REQ-20261015-004 文档选区快捷键（Ctrl+F 带入查找栏、Ctrl+L 加入引用）

- **状态**：实施中（代码已落地、验证全绿，**未提交**）
- **日期**：2026-10-15
- **执行台账**：`.plans/2026-10-15-doc-selection-shortcuts/`（plan.md 已完成 / checklist.md 已评审）
- **验证脚本**：`temp/verify-doc-selection-shortcuts.cjs`（25/25）
- **来源**：用户 @product-manager 提出的两个需求 + 两轮口径裁决

## 1. 背景与目标

在文档查看器里读文档时，"选中一段内容"之后的两个高频动作都要**手工搬运**：

1. 想在本篇文档里找这段话 → 按 `Ctrl+F` 打开查找栏（**空栏**）→ 手动输入/粘贴所选文本；
2. 想把这段话作为 AI 引用的依据 → 点面板「+ 加入引用」→ 再回到正文划选（两步，且要先点按钮）。

目标：选中正文内容后，`Ctrl+F` 直接把所选带入文档内查找栏并立即查找；`Ctrl+L` 直接把所选加入 AI 对话引用（面板未开则自动打开）。**两者都不改变"无选区 / 不可引用"时的既有行为。**

## 2. 改造前现状（🟢 代码直读）

| 事实 | 位置 |
|---|---|
| `Ctrl+F` 三档判定链：① 有 `.ki-drawer` → 文档内查找栏；② 有 `[data-ki-search-input]` → 聚焦应用内搜索框；③ 都无 → 不拦截 | `web/src/layouts/AppShell.tsx:362-389` |
| ① 分支只做 `focus()` + `select()`，**从不读选区文本** | 同上 `:367-379` |
| 跨组件事件明确约定「事件不带 payload，查看器展开后自行预填」 | `web/src/lib/docFind.ts:22-29`；接收处 `web/src/components/ModuleDrawer.tsx:475-486` |
| 引用数据模型**本就是片段级**：`ChatRef{group,doc,text}`，上限 5 条 / 单条 2000 字 / 合计 6000 字 | `web/src/api/chatContract.ts:44-57`；后端 SSOT `src/lib/chat/chat-contract.ts:68-74` |
| 已有划选加入引用的路径，但需先点「+ 加入引用」进入 `refArmed` 再划选 | `web/src/chat/ChatPanel.tsx:183`、`:199-241`、`:1608-1632` |
| 守卫（条数 / 单条长度 / 合计 / 去重）与文案在**三处各写了一遍** | `ChatPanel.tsx:213-235`（划选）、`:1005-1019`（选择器） |

## 3. 需求与最终口径（用户裁决）

| ID | 需求 | 口径（裁决） |
|---|---|---|
| R1 | 选中正文 → `Ctrl+F` → 查找栏带入所选、立即查找、文本全选 | **搜索框 = 文档内查找栏**（不是应用内搜索框；后者仅在无查看器时被 Ctrl+F 命中） |
| R2 | 无选区时 `Ctrl+F` 保持现状 | 展开空查找栏 / 聚焦并全选已有词，**不清空**用户已输入内容 |
| R3 | 选中正文 → `Ctrl+L` → 加入引用（面板开启时生效） | 复用片段级引用与既有守卫；**条件式拦截**（只有能构成引用才 `preventDefault`） |
| R4 | 面板未开启时按 `Ctrl+L` | **自动打开面板并加入引用**，不静默失败 |
| R5 | 选区策略 | 需求1 **放宽**（任意选区文本，填词无副作用）；需求2 **严格**（必须落 `.ki-drawer` 正文） |
| R6 | 取词策略（D3） | 只取**首个词**：首行 → 首个空白块 → 去首尾标点 → ≤40 字（码点计） |
| R7 | 可发现性（D5） | **不做**选区浮动按钮；复用「+ 加入引用」按钮 hover 提示 + armed toast + 查找栏放大镜 title 承载快捷键说明 |

## 4. 关键技术结论：`Ctrl+L` 可以拦截（🟢 Chromium 源码级证据）

`Ctrl+L` 是浏览器"聚焦地址栏"的快捷键，但**不在 Chromium 的保留命令清单**里：

```cpp
// chrome/browser/ui/accelerator_table.cc:68
{ui::VKEY_L, ui::EF_PLATFORM_ACCELERATOR, IDC_FOCUS_LOCATION}   // Ctrl+L / Cmd+L

// 同文件 :347-370 —— 浏览器真正抢走、网页无法拦截的只有这些：
constexpr int kReservedCommandIds[] = {
    IDC_CLOSE_TAB, IDC_CLOSE_WINDOW, IDC_NEW_TAB, IDC_NEW_WINDOW,
    IDC_NEW_INCOGNITO_WINDOW, IDC_NEW_ISOLATED_WINDOW, IDC_RESTORE_TAB,
    IDC_SELECT_NEXT_TAB, IDC_SELECT_PREVIOUS_TAB,
    IDC_CYCLE_TO_NEXT_TAB, IDC_CYCLE_TO_PREV_TAB, IDC_EXIT };
```

结论：非保留键 ⇒ 事件先给渲染器，网页 `preventDefault()` 后浏览器不再聚焦地址栏。
同表 `Ctrl+F`（`IDC_FIND`）同类且本项目早已抢占生效，是同仓行为级佐证。
`chrome/browser/ui/browser_command_controller.cc:487-545` 的 `IsReservedCommandOrKey` 只额外特判：App 模式不保留任何键 / 全屏时除 `IDC_FULLSCREEN`+`IDC_EXIT` 外全部交给网页 / Linux 用户自定义编辑热键不保留。

**未验证**：Firefox / Safari（Safari 对 Cmd 系保留更严）。地址栏仍有 `Alt+D`（同表 :140）与其它的入口，被占用后不至于无路可走。

## 5. 实现（4 个文件 + 1 个新文件）

| 文件 | 改动 |
|---|---|
| `web/src/lib/docFind.ts` | 新增 `pickFindSeed()`（R6 口径）+ `DOC_FIND_SEED_MAX=40` + `DocFindOpenDetail`；事件注释从"不带 payload"改为"可带 `{ query }`" |
| `web/src/layouts/AppShell.tsx` | Ctrl+F ① 分支：有选区文本 ⇒ 走事件通道带 payload（**已展开时也能换词**，受控 input 无法从外部赋值）；无选区 ⇒ 原逻辑 |
| `web/src/components/ModuleDrawer.tsx` | 事件 handler 消费 `detail.query` → `applyFindSeed()`（写入 + 恢复高亮开关 + 触发聚焦 effect）；放大镜 title 补「可带入选中文本」 |
| `web/src/chat/refSelection.ts`（新） | 引用判定与守卫**单一来源**：`drawerOfSelection` / `buildRefCandidate` / `checkRefAdd`（条数 → 单条截断 → 合计 → 重复 + 文案） |
| `web/src/chat/ChatPanel.tsx` | 三条入口（划选 mouseup / Ctrl+L / 选择器）统一复用 `checkRefAdd`；新增 `Ctrl+L` 监听（route 多实例门控 + 条件式拦截 + 面板未开自动打开）；两处文案（R7） |

## 6. 负向场景与处理

| # | 场景 | 处理 |
|---|---|---|
| N1 | 超长 / 多行选区 | `pickFindSeed` 取首行 + 首个块 + 40 字上限（避免整段塞进字面查找必然搜不到） |
| N2 | 选区不在文档正文按 `Ctrl+L` | **放行浏览器**（不 `preventDefault`、不加入）—— 空选区与导航项选区已实测 |
| N3 | 面板未开启 | 自动打开（走 `store.open`，URL `chat=1` 由 AppShell 镜像），并给"已加入引用"提示 |
| N4 | 条数 / 单条 / 合计 / 重复 | 复用同一守卫：前两者与重复给提示；选择器路径保持既有"静默"行为不变 |
| N5 | 连按 / 重复键 | `event.repeat` 直接返回；同段重复加入被去重拦截并提示 |
| N6 | `/chat` 页双实例 | dock 实例被路由派生收起 ⇒ 只让 page 实例响应（否则重复加入并弹出第二个面板） |
| N7 | 已展开查找栏时再按 `Ctrl+F` | 换成新所选；**无选区时不替换**（不误清已输入内容） |
| N8 | 加引用后选区 | **保留**（用户可接着 `Ctrl+F` 用同一段文本查找） |

## 7. 验收与证据（2026-10-15 实测）

- 单测：`web/test/doc-find.test.mjs` **33/33**（新增 8 例）、`web/test/ref-selection.test.mjs` **11/11**；web 全量 `npm test` **307/307**
- 类型与构建：`npx tsc --noEmit` **0 错**；`npm run build` **exit=0**（7423 服务的是 `web/dist`，验前已重建）
- 真实页面（`temp/verify-doc-selection-shortcuts.cjs`，headless Chromium → 7423）**25/25**：
  - A 段：带入所选 / 聚焦全选 / 立即查找有命中 / `prevented=true` / 已展开时换词 / 无选区不替换
  - B 段：引用 +1 与提示 / 来源文档名 / `prevented=true` / 选区保留 / 重复被拦
  - C 段：面板关闭时 `Ctrl+L` → 自动开面板 + 加入 + URL `chat=1` + 提示可见
  - D 段：**空选区**与**非正文选区**均 `prevented=false`（放行浏览器）
  - E 段：查找栏工具条入口与无选区聚焦行为未回归
- 既有脚本回归：`temp/verify-doc-inner-search.cjs` **48/48**；`probe-doc-inner-search`、`probe-doc-inner-search2`、`repro-cancel-then-find` 均 **EXIT=0**
- 截图：`temp/shots/doc-sel-ctrl-f.png`、`doc-sel-ctrl-l.png`、`doc-sel-ctrl-l-autoopen.png`

## 8. 已知边界

- Firefox / Safari 未验证（结论基于 Chromium 源码与实测）。
- 中文长句无空白可切 ⇒ `pickFindSeed` 会取整句（≤40 字），由 `buildFindTerms` 的 2–4 字滑窗兜底，命中会较多、定位精度低于英文词。
- 死键场景（既有缺陷，本次未修）：`AppShell` 判"存在 `.ki-drawer`"、查看器才判"可见" ⇒ 存在隐藏抽屉且无可见抽屉时 `Ctrl+F` 被 `preventDefault` 但查找栏开不出来。
- 引用仍受 5 条 / 6000 字上限约束（与既有口径一致，未放宽）。

## 9. 增量（2026-10-15 用户追加，同日实施完成）

| # | 增量需求 | 口径与实现 | 证据 |
|---|---|---|---|
| R7′（升级 R7） | 「+ 加入引用」按钮的 hover 提示**太粗糙**（原生 `title`），要求与「来源文档」chip 的悬浮卡片观感一致 | 新增 `.ki-chat-refbar__addwrap` + `.ki-chat-refbar__pop`（**复用 `.ki-chat-src__pop` 的视觉语言**：白底描边 / 圆角 / shadow-2 / `opacity+translateY` 过渡）。卡片内容：标题「加入引用」+ 快捷键行（`Ctrl+L`）+ 操作说明 + 上限提示（5 段 / 6000 字）；原生 `title` 移除（避免双提示），改 `aria-label` 供无障碍 | 脚本 F4/F5；截图 `temp/shots/doc-sel-ref-hover-card.png` |
| R8（新增） | 选中正文后**点击工具条放大镜**也应带入所选并立即查找（此前只有 Ctrl+F 会带入） | `openFindBar` 复用 `pickFindSeed` + `applyFindSeed`（与 Ctrl+F 同一实现）；**选区必须在 `onMouseDown` 抓取** —— 点击按钮会让正文失焦并清除 DOM 选区，只在 `onClick` 读会永远拿不到内容 | 脚本 F1/F2/F3 |

**实现要点（易踩）**：
1. hover 绑定在**包装元素** `__addwrap` 上而非按钮：按钮 `disabled`（达上限 / 配置未启用）时不派发鼠标事件，`:hover` 失效会让"已达上限"的说明一起消失。
2. 卡片定位基准是 **`.ki-chat-composer`**（已是 positioning context，与 `.ki-chat-refbar__toast` 同坐标），而不是按钮 → 卡片位置不随按钮在引用条中的左右位置漂移、不会溢出面板。
3. 说明文字用普通 `<span className="ki-chat-refbar__pop-note">` 而非 `<q>`：来源卡片的 `<q>` 语义是"摘要原文"（自带引号），操作说明加引号既不语义也不够干净（首版实现即如此，已修）。
4. 放大镜的键盘触发（Enter/Space）走 `onClick` 兜底读取当前选区。

**验收（增量）**：`temp/verify-doc-selection-shortcuts.cjs` 扩展 **F 段（7 项）** → 全脚本 **32/32 通过**（含 F6 加满 5 条进禁用态、F7 禁用态下卡片仍可见并说明原因）；`npx tsc --noEmit` 0 错；`npm run build` exit=0；web 全量单测 **307/307**；`temp/verify-doc-inner-search.cjs` **48/48**；`repro-cancel-then-find` EXIT=0。截图：`doc-sel-ref-hover-card.png`（常态）、`doc-sel-ref-hover-card-full.png`（禁用态）。

**增量轮的交付前审查（auto-review → code-review → challenger）修复了 2 项**（详见 `review/code-review.md` 增量轮章节）：
1. **P1 信息回归**：卡片化后丢了"已达上限"说明（原 `title` 有该分支）→ 卡片 note 补分支，并用 F6/F7 锁回归；
2. **P2 误填风险**：`pressedFindSeedRef` 在"按下后拖出按钮（click 未触发）"时残留、随后键盘 Enter 触发会代入陈旧词 → 只采信鼠标触发（`event.detail > 0`）的捕获值；
3. 无障碍补强：`aria-label` 增加达上限分支（disabled 元素不可聚焦，`:focus-within` 卡片对键盘不可达）。
