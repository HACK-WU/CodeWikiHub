# S-02 提示词与上下文

## 术语

- **追问上下文**：现由 `analysis-ask-runner::buildContext` 拼成的 `<event>/<conclusion>/<candidates>/<confirmed>/<history>` 文本块。

## 现状（AS-IS）

- system（line 180-185）："只能用下面给定的上下文回答，不要臆造路径/行号/结论，不超过 400 字，不要代码块"。
- `buildContext`：结论截 1200 字、候选 5、已确认 5、历史 2 轮，文档清单**不含正文**。
- 无工具时这套约束合理；带工具后"只能用给定上下文"与"可调工具再查"矛盾。

## 方案（TO-BE）

### 改动 1：system 改写为工具时代词

新 system（要点，非全文）：

```
你是事件分析的答疑助手，可调用只读工具重新取证：
- 先基于给定上下文判断；信息不足或用户质疑结论时，用工具查证（fs_* 读源码、ki_* 读知识库）
- 引用路径/行号必须来自本次工具返回或给定上下文，不得臆造
- 查证后回答（≤400 字，不输出代码块）；查不到就说"查不到"，并说明查了哪些方向
- 不改文件、不执行命令、不调用编排类工具
```

去掉"只能用下面给定的上下文回答"这条硬约束，改为"上下文是起点、工具用于核实"。

### 改动 2：上下文追加文档清单（采纳决策 C）

`buildContext` 入参新增 `docs: { members: Array<...>, refs: Array<...> }`，在 `<event>` 后追加：

```
<attached_docs>
关联文档（仅路径/名称，可用 ki_get_module_info 读正文）：
- group: X | name: Y
参考文档（同上）：
- group: X | name: Y
</attached_docs>
```

- 数据源：`collectMembers(scope, event.id)` + `readRefs(scope, event.id)`（与分析同源，S-01 已用到 `readRefs` 路径）。
- 无文档时输出"（无）"，不省略节点——让模型明确知道"没文档可查"。

### 改动 3：结论裁剪保持 1200 字不变

候选/已确认/history 条数不变，避免上下文先膨胀。

### 数据模型（buildContext 新签名）

```ts
buildContext(args: {
  event: AskTargetEvent;
  draft: AnalysisDraft;
  confirmed: Array<{ file: string; line: number; why: string }>;
  history: AnalysisAskTurn[];
  attachedDocs: { members: DocRef[]; refs: DocRef[] };  // 新增
}): { text: string; stats: {...} }

type DocRef = { group: string; name: string };
```

- `attachedDocs` 仅含路径/名称，无正文；由 runner 调 `collectMembers` / `readRefs` 组装（与 AI 分析同源）。
- stats 追加可选 `attachedDocsUsed: {members:number; refs:number}`（审计用，落 turn.context）。

## 异常处理

| 场景 | 行为 | 对外暴露 |
|---|---|---|
| 文档清单超长（>20 篇） | 截断并标注"仅显示前 20 篇" | 否 |
| 工具查到的内容与给定结论冲突 | system 要求以本次工具证据为准，说明差异 | 是（回答中） |

## 关键决策点

| 决策 | 采纳 | 被否方案 | 否决理由 |
|---|---|---|---|
| 上下文是否含文档正文 | 仅清单（路径+名称） | 塞入正文 | 与分析"轻量上下文"一致；正文按需调工具读 |
| system 硬约束去留 | 改为"起点+核实" | 保留"只能用上下文" | 与工具能力直接矛盾 |

## 影响范围

`src/lib/events/analysis-ask-runner.ts`（`buildContext` 签名 + 调用点、`askEventAnalysis` 的 system 拼装）。
