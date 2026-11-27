# S-04 前端展示与文档同步

所属：`REQ-20261124-001` ｜ 依赖：S-01（DTO）、S-03（补丁 diff 字段）｜ 被依赖：无

## 1. 术语

| 术语 | 定义 |
|---|---|
| 数据链路块 | 结论卡内与「分析结论」「未确认点」并列的第三块，类名 `.gov-datalink` |
| 无链路三态 | ① 有值 → 正常块（**降级文案也算有值**）；② 无值 + `source=external` → 灰块「外部上传未提供链路」；③ 无值 + AI → 整块不渲染（异常兜底，见下） |
| 「区块必在」的兑现方式 | 由**提示词**保证（S-02 第 8 条要求取不到时也写降级文案，故 `dataFlow` 非空）；前端「无值不渲染」只处理"模型漏给 / 老数据"这类异常，不承担该承诺 |
| 横滑提示 | 树内容宽于容器时，标题行追加「↔ 可横滑」，避免用户以为内容就这些 |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `web/src/components/governance/event-detail/EventAnalysisCard.tsx:328-349` | 结论卡：`ConclusionChain` 或纯文本 `conclusion` |
| `EventAnalysisCard.tsx:284-301` | 编辑态把只读结论塞进 `AnalysisEditor` 的 `conclusionBlock` |
| `web/src/components/governance/AiAnalyzePanel.tsx:515-534` | 过程区末尾「最终结论」，同样复用 `ConclusionChain` |
| `web/src/components/governance/event-detail/ConclusionChain.tsx` | 因果链渲染，节点正文只切单反引号，**不渲染多行 pre** |
| `web/src/styles/governance.css:2182 / 2635-2776` | 结论块 `.gov-conclusion`（紫底紫条）与因果链样式；无链路块样式 |
| `web/src/api/governanceContract.ts:511-514` | `AnalysisDraftDto` 无 `dataFlow` |

## 3. 方案（TO-BE）

### 3.1 组件契约 `web/src/components/governance/event-detail/DataFlowBlock.tsx`

```tsx
export interface DataFlowBlockProps {
  /** 多行文本树；undefined / 空串 = 没有链路 */
  dataFlow?: string | null;
  /** 结论来源：external 且无链路时要显式说明，AI 则整块不渲染 */
  source?: 'ai' | 'external';
}
/** 三态渲染；AI 无链路时返回 null */
export function DataFlowBlock(props: DataFlowBlockProps): JSX.Element | null;
```

职责：
1. `<section className="gov-datalink" aria-label="数据链路">` + 标题行（`数据链路` / `N 步 · M 字` / `复制`）
2. `<div className="gov-datalink__scroll"><pre className="gov-datalink__tree">{text}</pre></div>`
3. `useEffect` + `ResizeObserver` 监听 `scrollWidth > clientWidth`，命中时给根节点加 `data-overflow="1"`（CSS `::after` 出「↔ 可横滑」）
4. 复制：`navigator.clipboard.writeText` → 失败回退 `document.execCommand('copy')`；按钮文案「复制 / 已复制 / 复制失败」1.6s 复位
5. 外部无链路态：灰块 + 「外部上传未提供链路」
6. **安全**：文本一律作为 React 文本节点渲染（`<pre>{text}</pre>`），**禁止** `dangerouslySetInnerHTML` —— 内容来自模型且含用户可写的代码路径，走 HTML 会引入注入面

### 3.2 三处挂载（顺序固定：分析结论 → **数据链路** → 未确认点）

| 位置 | 改动 |
|---|---|
| `EventAnalysisCard.tsx` 结论区之后、`gov-unconfirmed` 之前 | `<DataFlowBlock dataFlow={draft?.dataFlow} source={draft?.source} />` |
| `EventAnalysisCard.tsx` 编辑态 `conclusionBlock` 内、`ConclusionChain` 之后 | 同上（只读展示，编辑 UI 不提供输入） |
| `AiAnalyzePanel.tsx:534` 之后 | 同上（`boxed` 语境下沿用同一组件） |

### 3.3 样式 `web/src/styles/governance.css`

从已确认 demo 的段 C 原样搬入（类名一致，`.gov-datalink` 全族）：

| 规则 | 关键值 |
|---|---|
| `.gov-datalink` | `display:flex; flex-direction:column; gap:6px; padding:12px; border-radius:6px; background: text-subtle 8% 混 surface; border-left:3px solid purple 35%` |
| `__head` | `display:flex; align-items:baseline; gap:8px`（无底色条，与 `.gov-unconfirmed__head` 同语法） |
| `__title` | 11px/700/purple；`__meta` 10.5px subtle（`::before` 加「·」） |
| `[data-overflow] __meta::after` | `" · ↔ 可横滑"` |
| `__copy` | 仿 `.ki-code-copy`：surface + border，hover 转紫，`align-self:center` |
| `__scroll` | `overflow-x:auto; overflow-y:auto; max-height:520px`（8~10 步完整展开，超 520 才滚） |
| `__tree` | `font-family: mono; font-size:11.5px; line-height:1.95; white-space:pre; tab-size:4`（**禁折行**） |
| `.is-empty` | 底退成 `bg 70% + surface`，左条转中性，标题转 subtle，`strong` 用 warning |

> 编辑态所属容器（`.gov-dedit__block`）内不套 `.gov-datalink` 的外壳 padding 与结论块冲突时，允许加一层 `.gov-datalink--nested` 只改 `padding:10px`，其余不变。

### 3.4 契约副本

`web/src/api/governanceContract.ts:511-514` 的 `AnalysisDraftDto` 同步增 `dataFlow?: string`（与 S-01 后端成对，`test/governance-contract.test.ts` 逐字比对）。

## 4. 界面（已确认，2026-11-24）

```
┌ 分析结论 · 5 个节点 · 引用 2 处 ───────────┐  ← 紫底 + 紫竖条
│ 一句话总结 + 5 个因果节点                   │
└────────────────────────────────────────────┘
┌ 数据链路 · 8 步 · 2 处位置         [复制] ─┐  ← 中性底 + 紫竖条（新增）
│ 前端打开「链路状态」页 → transfer_latest_msg│
│     │                                       │
│     ▼                                       │
│ table_ids = 全部表的 set（上限无约束）      │
│     │                                       │
│     ▼                                       │
│ …（等宽、不折行、超宽出「↔ 可横滑」）       │
└────────────────────────────────────────────┘
┌ 未确认点 · 2 项 ───────────────────────────┐  ← 琥珀底 + 琥珀竖条
└────────────────────────────────────────────┘

降级态（AI 未取到，由模型写进 dataFlow）：
┌ 数据链路 · 未取到 ─────────────────────────┐
│ 未取到数据链路：已检查 <方向1>、<方向2>；    │
│ 缺 <关键证据>。可追问「沿 X 再查一次」。     │
└────────────────────────────────────────────┘
```

形态基线：`demo/ui/data-flow-tree/index.html`（三档 × 三宽度，已真机验证）。

## 5. 文档与 skill 同步

| 位置 | 改动 |
|---|---|
| `skills/event-report/SKILL.md` | 写工具章节补：`analysis` 可带 `dataFlow`（可选）；推终态前除未确认点，顺带核对链路是否与当前阶段一致 |
| `skills/event-report/reference.md` | 工具参数表 `ki_event_edit` 行补 `dataFlow` |
| **三份副本同步** | `skills/event-report/` → `.codebuddy/skills/event-report/` → `~/.codebuddy/skills/event-report/`（**非软链**，改源后手动同步，否则运行时静默用旧版） |

## 6. 影响范围

| 文件 | 类型 |
|---|---|
| `web/src/components/governance/event-detail/DataFlowBlock.tsx` | **新增** |
| `web/src/components/governance/event-detail/EventAnalysisCard.tsx` | 改（两处挂载） |
| `web/src/components/governance/AiAnalyzePanel.tsx` | 改（一处挂载） |
| `web/src/styles/governance.css` | 改（新增 `.gov-datalink` 段） |
| `web/src/api/governanceContract.ts` | 改（DTO 副本） |
| `web/src/components/governance/event-detail/AskBlock.tsx` | **归 S-03**（补丁采纳与弹框都在那边），本子需求只读 |
| `docs/mcp-tools.md` | **归 S-03**（MCP 参数文档），本子需求只读 |
| `skills/event-report/*`（含 2 份副本） | 改（文档） |

## 7. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 块位置 | 与「未确认点」同级独立块（`.gov-dcard__body` 直接子元素） | 嵌在紫色结论壳内（`ConclusionChain` 之内） | 已拍板 U2；且链路与因果链的语义不同（路径 vs 因果），同壳会让读者把树当结论的一部分 | 无 |
| 老数据（无键）渲染 | 整块不渲染 | 一律渲染灰块「本次分析未生成链路」 | 升级后所有历史结论都变灰块，满屏噪音；且无法区分"老数据"与"新分析但模型漏给" | 连续 20 次新分析中出现 ≥3 次链路段缺失，改为渲染提示并可一键重跑 |
| 外部上传缺链路 | 渲染灰块并说明「外部上传未提供链路」 | 同样不渲染（与 AI 一致） | 外部来源是明确的可控方，用户需要知道"是对方没给"而不是"能力没做" | 无 |
| 组件形态 | 独立 `DataFlowBlock.tsx` | 内联在三处调用点 | 三处重复渲染逻辑（含溢出探测与复制）必然漂移 | 无 |
| 复制按钮 | 有（含失败回退） | 不做 | 链路是纯文本，用户真实诉求是贴到工单/聊天里 | 无 |
| 位置可点 | 不做（树内 `file:line` 为纯文本） | 复用 `.gov-chain__ref` 胶囊 | 已拍板 U5；pre 内嵌 button 会破坏选中与复制，且需行级解析 | 若改为结构化节点方案时一并做 |

## 8. 待定问题

| # | 问题 | 影响 | 处理 |
|---|---|---|---|
| Q1 | 编辑态内层 padding 是否要 `.gov-datalink--nested` | 视觉贴合度 | 实施时真机看，若与 `.gov-dedit__block` 冲突再加，不预设 |
| Q2 | 面板（`AiAnalyzePanel`）内块宽度更窄，是否默认折叠 | 长树占满过程区 | 先完整展示；若过程区被顶太长再评估折叠 |
