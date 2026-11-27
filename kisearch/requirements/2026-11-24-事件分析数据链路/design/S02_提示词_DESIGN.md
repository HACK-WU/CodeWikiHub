# S-02 提示词

所属：`REQ-20261124-001` ｜ 依赖：S-01（字段名与上限）｜ 被依赖：S-03（降级句式复用）

## 1. 术语

| 术语 | 定义 |
|---|---|
| 输出格式权威段 | `buildOutputTail(view)` 返回的字符串，拼进 system 消息；**链路写法与降级句式的唯一真源** |
| 可编辑提示词 | `DEFAULT_ANALYSIS_PROMPT`，用户可在提示词配置里改；**不得复述**骨架与格式 |
| 视角语义（`flowGuide`） | 每个 `AnalysisView` 一句「链路该画成什么样」，只换语义不换格式 |

## 2. 现状（AS-IS）

| 位置 | 现状 |
|---|---|
| `src/lib/events/analysis-runner.ts:339-392` | `buildOutputTail(view)`：第 0 条声明唯一权威；第 5 条给 JSON 字段示意（`conclusion` / `chain` / `candidates` / `unconfirmed`）；第 6 条写 chain 约束（2~N 节点、一节点一句、不换行、不写代码块、branches 仅 root ≤3） |
| `src/lib/events/analysis-view.ts:49-68` | `ViewProfile` 有 `name / labels / skeleton / emphasize / flag / rail / wide / summaryGuide / locateGuide`，无链路语义 |
| `src/lib/events/analysis-view.ts:82-127` | 四档 `PROFILES`（fault / perf / change / generic），只换词与呈现，数据结构不动 |
| `src/lib/chat/prompt-config.ts:817-854` | `DEFAULT_ANALYSIS_PROMPT` 第五节「输出前自检」：conclusion 一句话、chain 顺序按系统提示、ref 指向 candidates、candidates 可空 |
| 既有踩坑 | 骨架曾在 tail 与默认提示词**两处定义**，导致模型收到互斥指令；口径是「唯一权威是 tail，默认提示词不复述」 |

## 3. 方案（TO-BE）

### 3.1 `ViewProfile` 增 `flowGuide`

`src/lib/events/analysis-view.ts` 的接口与四档 `PROFILES` 各加一句（前端副本 `web/src/lib/analysisView.ts` **不镜像** `PROFILES`，无需同步）：

| 视角 | `flowGuide` |
|---|---|
| `fault` | 故障传播链 —— 触发条件 → 出错的那一跳 → 暴露给用户的现象，并标出哪一跳是根因 |
| `perf` | 耗时 / 排队链路 —— 入口 → 各跳（能量化就写耗时占比或数据量）→ 出口，并标出瓶颈那一跳 |
| `change` | 改动落点链路 —— 页面 → 接口 → 服务 → 表，并标出本次要改的那几跳 |
| `generic` | 相关调用链 —— 谁在用 → 怎么用 → 受影响面 |

### 3.2 输出格式权威段：JSON 示例加字段

第 5 条的字段示意中，`chain` 之后插入（**注意是含 `\n` 转义的 JSON 字符串**，示例要直接给转义写法；下例里的 `\n` 是**字面两个字符**，不是真换行，落地时不要被编辑器转义成多行）：

```
  "dataFlow": "前端打开「链路状态」页 → transfer_latest_msg\n    ▼\ntable_ids = 全部表的 set（上限无约束）\n    ▼\n…\n用户看到「空图」，配置实际在采集",
```

### 3.3 输出格式权威段：新增第 8 条（写法 + 降级）

```
8. **dataFlow（数据链路）**：用文字树描述这次问题的执行路径，是 chain 之外的第 6 段内容。
   - 3~15 步，每步一行；行间用 `▼` 表示流向，分叉用 `├─` / `└─`；缩进只用空格（不用 tab）；每行 ≤100 字。
   - 能指认位置时直接写 `相对路径:行号` 纯文本（不必是 candidates 里的，前端不会把它做成就胶囊）。
   - 本视角的链路语义：${p.flowGuide}。
   - 它是 JSON 字符串：**所有换行必须写成 \n 转义**，不写裸换行、不加 ``` 围栏。
   - **取不到就降级，不要编造**：证据不足以画出完整路径时，写
     `未取到数据链路：已检查 <方向1>、<方向2>；缺 <关键证据>。可追问「<一句具体取证动作>」`
     —— 这与第 3 条「空结果是正确结论」同一取向，比编一条看似合理的链路有用得多。
```

### 3.4 提示词契约（本子需求没有 HTTP 接口，它的「接口」就是模型输出形状）

| 契约项 | 定义 |
|---|---|
| 输出字段 | `dataFlow?: string` —— **JSON 字符串**，换行写成 `\n` 转义 |
| 字段语义 | 3~15 步的执行路径文字树；证据不足时写降级句式（不编造） |
| 生成者（唯一真源） | `buildOutputTail(view)`（`analysis-runner.ts:339-392`） |
| 消费方 | `parseJsonSummary` → `normalizeDataFlow`（S-01）；`ki-conclusion-patch`（S-03） |
| 失败兜底 | 字段缺失 / 类型非法 → 解析为 `undefined`；前端按 S-04 三态处理，不报错 |
| 文本槽位 | ① 第 5 条 JSON 示例（`chain` 之后）② 第 8 条写法与降级 ③ `ViewProfile.flowGuide` ④ 默认提示词自检一句 |

**变更纪律**：这四处任一改动都属契约变更，必须同步更新本表与 `demo-verify` 的验收断言；默认提示词侧**永不**承载格式细节。

### 3.5 可编辑提示词：只加一条纪律

`src/lib/chat/prompt-config.ts:846-852` 自检段追加一行：

```
- dataFlow（数据链路）取不到时按【系统输出与安全规范】的降级句式写，不要为了凑格式编造节点
```

**不得**出现：箭头符号说明、步数、字段结构、行数上限（避免与 tail 两处定义）。

## 4. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/events/analysis-view.ts` | `ViewProfile` 接口 + 四档 `PROFILES` 各加 `flowGuide` |
| `src/lib/events/analysis-runner.ts:366-391` | 第 5 条 JSON 示例加 `dataFlow`；新增第 8 条 |
| `src/lib/chat/prompt-config.ts:846-852` | 自检段加一行 |
| `test/events/analysis-view.test.ts` | 断言四档 `flowGuide` 非空且互不相同 |

## 5. 关键决策点

| 决策 | 结论 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| 视角语义怎么表达 | `ViewProfile.flowGuide` 一句 | ① 在 tail 里按视角写四段 if/else 分支文案；② 新增 `dataFlow` 专用的节点 kind | ① tail 会膨胀且四段文案容易与 `skeleton` 漂移；② 链路不是因果节点，塞进 `ConclusionNodeKind` 会污染 chain 的语义与前端词表 | 若某视角需要完全不同的**格式**（不只是语义），再拆 |
| 降级句式放哪 | tail（唯一权威） | 放 `DEFAULT_ANALYSIS_PROMPT` | 该常量用户可改（`edited` 机制），改了就没纪律；且与既有「两处定义互斥」踩坑同型 | 无 |
| 是否强制每步带 `file:line` | 不强制，只要求「能指认就写」 | 强制每步带位置 | 纯文本链路的位置不可点、不校验，强制只会诱发编造行号（违反第 2、3 条纪律） | 若将来升级为可点胶囊，同步改为强制且校验 |
| 上限写在哪 | 写在 tail 第 8 条（3~15 步 / 每行 ≤100 字）；归一上限只在 S-01 | tail 与默认提示词都写 | 两处写会漂移（既有踩坑） | 无 |

## 6. 待定问题

| # | 问题 | 影响 | 处理 |
|---|---|---|---|
| Q1 | 3~15 步的区间是否过宽 | 过长会导致横滑 | 用一次 `demo-verify` 实测四类事件后校准，属调参不改结构 |
