# SR-02 前端对话面板 · 只读 Code Review 报告

> 评审角色：SR-02 变更专业 Code Reviewer（只读，未修改任何代码）
> 仓库根：`/Users/wuyongping/projects/knowledge-indexer`　｜　分支：`feat/sidebar-ai-chat`
> 变更基线（冻结点）：tag `freeze/REQ-20260924-001` = commit `c6a1c176df5f39edce0ba7ba85ef7b80c65a5d6d`
> 被评审 HEAD：commit `414c570cb310b61b3c6389b1fbe123da446683d3`
> 评审日期：2026-09-26
> 取证约束：GitNexus MCP 对本仓库**未索引，不可用** → 全部结论以 `grep` + 源码直读 + 只读命令实跑为依据

---

## 0. 实际执行的验证命令与结果

| 命令 | 结果 | 说明 |
|---|---|---|
| `git --no-pager diff --stat freeze/REQ-20260924-001 HEAD -- web/ test/` | 完成 | web 侧变更 6 个文件：`chatApi.ts(+292)`、`ChatPanel.tsx(+403)`、`chatStore.ts(+119)`、`useChatStream.ts(+250)`、`SourcesList.tsx(±2)`、`ki.css(+333)`；测试 `e2e-sr02-sources.test.ts(+391)` 新增 |
| `git diff --stat freeze/... HEAD -- web/src/api/chatContract.ts` | **空输出** | 前端契约字段形状**未改** |
| `git diff --stat freeze/... HEAD -- web/src/components/` | **空输出** | 既有组件**未改** |
| `git diff --stat freeze/... HEAD -- design/ api/` | **空输出** | 设计/接口文档**未改** |
| `git diff --stat freeze/... HEAD -- test/chat/{contract-parity,data-flow,acceptance-sr02}.test.ts` | **空输出** | 禁改测试**未改** |
| `git diff --stat freeze/... HEAD -- test/chat/e2e-sr02-sources.test.ts` | 与冻结点一致（非本片改动） | 该文件本身即为 SR-02 交付物，位于其独占写区 |
| `git diff --name-only freeze/... HEAD -- web/` | 6 个文件 | 全部落在 SR-02 ownership 独占写区 |
| `git log -1 --format="%H %ad %s" -- web/src/layouts/AppShell.tsx` | `0251472 2026-09-25 22:51:19 feat(chat): 骨架落地 + 砖头包` | AppShell **最后修改者在骨架期**，实现期**未改**（详 §3.2） |
| `git show freeze/REQ-20260924-001:web/src/layouts/AppShell.tsx \| grep -n "createChatStore\|ChatPanel\|chatOpen"` | 命中骨架期第 9/10/71/72/73/75/172/188 行 | **store 创建 + 顶部开关 + `<ChatPanel/>` 挂载在骨架期已完成** |
| `git diff freeze/... HEAD -- web/src/styles/ki.css \| grep "^@@"` | 仅 1 个 hunk `@@ -1473,3 +1473,336 @@` | ki.css 为**纯追加**（333 行全在文件尾），既有规则零改动 |
| `grep -rn "STUB:SR-02" web/src/` | **无输出**（exit=1） | 桩残留清零 |
| `grep -rn "\.delivery/mocks" web/src/` | **无输出**（exit=1） | 生产代码无 mock 引用 |
| `grep -rn "EventSource" web/src/` | 仅 `chatApi.ts:6` 注释中的"不用"说明 | 无 `EventSource` 实现 |
| `grep -rn "dangerouslySetInnerHTML" web/src/` | 仅既有 `MarkdownPreview.tsx:608` | chat 模块自身未引入 |
| `cd web && npx tsc --noEmit` | **exit=0** | 前端编译通过 |
| `npx jiti test/chat/e2e-sr02-sources.test.ts` | **14 tests / 14 pass / 0 fail** | 真实 HTTP + 真实 SSE 分块（7 字节切帧）驱动 |
| `npx jiti test/chat/acceptance-sr02.test.ts` | **10 tests / 10 pass / 0 fail** | 片级验收（纯逻辑层） |
| `npx jiti test/chat/contract-parity.test.ts` | **10 tests / 10 pass / 0 fail** | 前后端契约形状一致 |
| `npx jiti test/chat/data-flow.test.ts` | **7 tests / 7 pass / 0 fail** | 数据链路可串 |
| `grep -n "ki-doc-highlight" web/src/styles/ki.css` | 命中既有 `.ki-doc-highlight`（1235/1242，骨架期已存在） | 来源引用未新建高亮机制 |

**运行限制声明**：本项目 `web/test` 仅 `node --test`（**无 DOM 环境**），故上述实跑均**不覆盖 React 组件渲染链路**——第 5/6 项验收（D15 显隐不丢 / 来源引用回原文）无自动化断言，见 §2.1-④、§5。

---

## 1. 问题清单（按严重度）

### [P0-1] 并发流互踩：旧流 `streamEnd` 无条件重置新流累积态 → 新回答整段丢失（**实证竞态缺陷**）

> **本项为 v2 修订（2026-09-26）**：初版报告中本项被判为「机制脆弱 / P1-3」，经 team-lead 独立复核并提供 **reducer 级实测**后**升级为 P0 实证竞态缺陷**。我复核源码后**确认该判断成立**，初版「单写者 `run()` 先 `streamStart` 再 abort 旧流、顺序正确、避免旧流 finally 抢占新流 ✅」的结论**错误，特此更正**。

- **位置**：
  - `web/src/chat/useChatStream.ts:133-148`（`run()` 的 dispatch/abort 顺序）
  - `web/src/chat/useChatStream.ts:118-128`（`consume` 的 `finally`：**无条件** `streamEnd`）
  - `web/src/chat/chatStore.ts:182-190`（`streamEnd` 把 `streaming` 重置为 `INITIAL_CHAT_STATE.streaming`）
  - `web/src/chat/chatStore.ts:210-214`（`finalizeStream` 的 `if (!messageId) return messages` 丢弃门槛）
- **证据（时序机理）**：
  ```ts
  // useChatStream.ts:134-145
  store.dispatch({ type: 'streamStart', messageId });   // ① 同步
  const prev = ctrlRef.current;
  if (prev) { abortedRef.current.add(prev); prev.abort(); }  // ② 同步触发，但…
  const ctrl = new AbortController();
  ctrlRef.current = ctrl;
  return consume(convId, ctrl, makeStream);
  ```
  ```ts
  // useChatStream.ts:118-128（旧流的 finally，在后续微/宏任务中才执行）
  } finally {
    const userAborted = abortedRef.current.has(ctrl);
    abortedRef.current.delete(ctrl);
    if (ctrlRef.current === ctrl) ctrlRef.current = null;   // ← 只用于清 ref
    store.dispatch({ type: 'streamEnd' });                  // ← 无条件！无「仅当前流可收尾」守门
  }
  ```
  **`dispatch` 虽同步，但旧流 `finally` 的触发时机由事件循环决定，`run()` 内的先后顺序无法约束它**（初版判断的错误所在）。旧流若阻塞在**不接收 signal** 的路径上（如 `runKbSearch(...)` → `executeSearch`），其 `finally` 会被**显著推迟**，从而**必然落在新流 `meta` 之后**。
- **team-lead 提供的 reducer 级实测（忠实还原该时序）**：
  ```
  streamStart{m-new}   ← 新流 meta
  streamEnd            ← 旧流被 abort 后的 finally
  streamContent '这是新回答的正文'
  streamEnd            ← 新流收尾
  ```
  实测结果：
  ```
  messages: []
  streaming.active: false | messageId: null
  新流正文是否保留: ❌ 丢失（BUG 成立）
  ```
  我复核根因链**成立**：旧流 `streamEnd`（`chatStore.ts:182-190`）把 `streaming` 重置为初始态 → `messageId = null`；新流的 `streamContent` 仍能追加进 `streaming.content`（`chatStore.ts:144-149` 不校验 `active`/`messageId`），但新流自己的 `streamEnd` → `finalizeStream` 在 `:214` `if (!messageId) return messages` **整段丢弃**。
- **影响**：**用户可见的数据丢失**。触发场景极现实——**检索进行中切会话 / 点重新生成 / 编辑重发**（正是 D13 引入检索后"发送→首答"数秒窗口内的常规操作）。表现为"回答生成完了但气泡不出现"。
  与 D15 的关系：D15 的 abort 时机（"仅切会话 / 删会话 / daemon 退出才中止"）**本身被正确遵守**（关闭面板不 abort，见 §2.1-③ ✅）；本项是**abort 之后的收尾竞态**，属 D15 承诺"不产生交错消息"（需求 N2）的落空，非 abort 时机错误。**两者结论不冲突，需分别裁决**。
- **测试覆盖**：❌ **零覆盖**。`e2e-sr02-sources.test.ts` 的四条 mock 链路（正常/降级/检索不可用/中止）**全部是单流**，无任何并发/blur 场景；`acceptance-sr02.test.ts:64-73` 的"切会话才清空当前会话态"只测单次 reducer 调用，**不涉及两个流的交错**。故全部测试仍全绿——这是本缺陷逃逸的直接原因。
- **建议（修复方向，属实现方职责）**：
  1. **引入流序号令牌（推荐）**：`run()` 每次自增 `seq`（组件内 `useRef<number>`），把 `seq` 随 `consume` 传入；`finally` 内改为 `if (seqRef.current === mySeq) store.dispatch({type:'streamEnd'})`——**`streamEnd` 仅由当前流触发**，旧流的收尾对新流完全无副作用。同理 `ctrlRef`/`abortedRef` 的清理也应带 seq 判定。
  2. **或给 `streamEnd` 加消息身份校验**：`dispatch({type:'streamEnd', messageId})`，由 `chatReducer` 在 `streaming.messageId !== action.messageId` 时直接返回原 state（**需改 `ChatAction` 形状**——`chatStore.ts` 非冻结文件，但属接口变化，改前需评估影响面）。
  3. **或缩减"无 messageId 即丢弃"门槛**：不推荐——那会把"中止且 content 为空"的另一种正确语义一起放开（`chatStore.ts:212` 注释的既有约定）。
  4. **必须补并发用例**（否则该缺陷无守门）：构造"旧流 abort 延迟到新流 meta 之后"的时序，断言**新流内容完整保留**且 `streaming.active === false`。因无 DOM 环境，可退化为直接驱动 `chatReducer` 的时序用例（正如 team-lead 的实测那样），**放在 e2e 侧复刻分派表即可落地**。

### [P1-1] R9 明确要求的中止标记「已中止」不可达（用户中止 → 标记被吞）

- **位置**：
  - `web/src/chat/useChatStream.ts:224`（`case 'sources'`）与 `:250-253`（`aborted` 落在无操作分支）
  - `web/src/chat/chatStore.ts:236`（`finalizeStream` 写死 `aborted: false`）
  - `web/src/chat/ChatPanel.tsx:290`（`message.aborted ? <span>已中止</span> : null`）
- **证据**：
  ```ts
  // useChatStream.ts:239-253
  case 'done':
    if (ev.sources && ev.sources.length > 0) store.dispatch({ type: 'streamSources', sources: ev.sources });
    return;
  // usage / aborted / error 不改变累积态：
  case 'usage':
  case 'aborted':
  case 'error':
    return;
  ```
  ```ts
  // chatStore.ts:228-238（finalizeStream 新建消息分支）
  id: messageId, role: 'assistant', content,
  at: new Date().toISOString(),
  // 中止的标记由 useChatStream 通过 `aborted` 事件补齐（见 N6）；
  // 此处只负责"已生成部分不丢"这一条硬要求。
  aborted: false,
  ```
  全仓 grep 确认：`aborted` 无任何写入路径——
  `streamStart`（`chatStore.ts:129-142`）不接该字段；`streamEnd`（`:182-190`）调用 `finalizeStream` 时恒写 `false`。
- **问题**：`aborted` 事件被显式丢弃（`void abortedEvent;` 于 `useChatStream.ts:126`，注释还自承"标记在收尾时统一处理"，但收尾处并无处理），且 `finalizeStream` 恒写 `aborted: false`。→ **`ChatPanel.tsx:290` 的「已中止」渲染条件永远不成立**。
- **影响**：需求 R9「已生成部分保留并**标记「已中止」**」、S03 §5「用户中止 → 已生成内容保留 + 「已中止」标记」、S03 §3.4「前端把最后一条标记「已中止」」三条要求均未达成。用户中止后看到一段与正常完成**外观完全相同**的截断回答，无法区分"被中止"与"已完成"，属**静默语义**（与 N17 精神相悖）。注：N6/需求 §5「仅切会话 / 删会话 / daemon 退出才中止」指的是 **abort 触发时机**，不含"落盘标记"；SR-01 侧 `messages.md` 有 `aborted` 落盘字段，两端能力已具备，缺口仅在本片映射层。
- **建议**：改代码属实现方职责。最小修法：`ChatStore` 增一条流式动作（如 `{type:'streamAborted'}`）或在 `streamEnd` 载荷带 `aborted` 标记 → `finalizeStream` 按其写入（替换/新建两分支都要）；`useChatStream` 在 `aborted` 事件 / `userAborted` 时 dispatch。同时删除 `void abortedEvent` 死代码。**修后必须补一条断言**（否则该字段仍无守门）。

### [P1-2] T12 隐私确认无确认入口 → 一旦 `ackRequired:true`，面板永久不可用

- **位置**：`web/src/chat/ChatPanel.tsx:99`（阻塞）、`:204-208`（仅文字提示）、`:82`（`ackDisclosure` 封装存在但无调用方）
- **证据**：
  ```
  ChatPanel.tsx:99   if (config.ackRequired) return '需先确认内容外发';   // 阻塞
  ChatPanel.tsx:204  {config?.ackRequired ? (<div className="ki-chat-panel__notice" role="alert">…确认后方可发送。</div>) : null}
  ```
  `grep -rn "ackDisclosure" web/src/` → 仅命中 `chatApi.ts:82` 的定义处，**无任何调用点**。
- **问题**：`ackRequired === true` 时发送被阻塞（✅ 满足"未确认前阻塞发送"），但只渲染了一段说明文字，**没有任何"确认"按钮 / 弹层 / 调用 `POST /api/chat/config/ack` 的路径**。
- **影响**：需求 T12 / S07 §3.8 / S03 §9.4 要求"展示**一次性确认弹层** → 用户确认 → 调 API-13 写回配置 → 恢复可用"。当前实现只兑现了"阻塞"，未兑现"可确认"。在用户已配置模型但尚未 ack 的环境下（首次使用、或配置文件重置），**整个对话面板不可用且无自救出口**——这正是 N17 禁止的"用户白做功"。
- **建议**：补确认入口（按钮 → `ackDisclosure()` → 成功后 `setConfig({...cfg, ackRequired:false, retrievalEnabled:true})`）。**注意 `chatApi.ts` 已正确认识到边界**：`toApiError` 保留 `code`；且 `api/retrieval.md:153` 明确要求"配置文件不可写 → 500 `CHAT_WRITE_FAILED`；**前端不得据此放行**"——即 `ackDisclosure()` 抛错时**不得**乐观放开发送。
- **不确定项**：本仓库当前是否真会进入 `ackRequired:true` 未实证（依赖用户 `~/.ki/config.yaml` 的 `kbDisclosureAck`）。该问题仅在触发时暴露，但触发后是**硬阻塞**，故不宜降级。

### [初版 P1-3 的两条独立结论 — 已被上文 [P0-1] 取代 / 部分保留]

> **归属更正（v2，2026-09-26）**：初版把两条**不同性质**的问题混在一条 P1-3 里，现拆分并归档如下。
> **① 竞态缺陷**（初版正文"单写者顺序正确 ✅"的结论**错误**）→ 已升级为 **[P0-1]**，见上。
> **② 生命周期状态归属**（初版"机制脆弱"部分）→ **结论维持，降级为 [P2-10]**，见本条末尾。

**初版原文中被判错误的一段（留档，勿引用）**：
> ~~"单写者 `run()` 先 `streamStart` 再 abort 旧流，顺序正确，避免旧流 finally 的 `streamEnd` 抢占新流 ✅"~~

该结论**不成立**：`dispatch` 虽同步，但旧流 `finally` 的触发时机由事件循环决定，`run()` 内的语句顺序**无法约束**它；且 `finally` 中 `streamEnd` **无条件**，`ctrlRef.current === ctrl` 只用于清 ref、**不影响 dispatch**。细节与实测见 **[P0-1]**。

#### [P2-10] `useChatStream` 把生成生命周期（AbortController）放在**组件级 ref** 而非 store

- **位置**：`web/src/chat/useChatStream.ts:66`（`ctrlRef`）、`:68`（`abortedRef`）、`:71-80`（卸载 abort）；调用点 `web/src/chat/ChatPanel.tsx:52`
- **证据**：
  ```ts
  // useChatStream.ts:64-80
  export function useChatStream(store: ChatStore): ChatStreamApi {
    const ctrlRef = useRef<AbortController | null>(null);
    const abortedRef = useRef<Set<AbortController>>(new Set());
    useEffect(() => {
      return () => {                        // ← 卸载时的清理
        const ctrl = ctrlRef.current;
        if (ctrl) { abortedRef.current.add(ctrl); ctrl.abort(); ctrlRef.current = null; }
      };
    }, []);
  ```
  ```tsx
  // ChatPanel.tsx:50-55
  export function ChatPanel({ store, open }: ChatPanelProps): JSX.Element | null {
    const scope = useScopeValue();
    const stream = useChatStream(store);        // ← hook 在组件内，ref 亦在组件内
    const state = useSyncExternalStoreCompat(store);
    ...
  ```
  `chatStore.ts` 的 `streaming` 中**没有** `abortController` / `aborted` 字段（状态形状见 `chatStore.ts:36-56`、`ChatAction` 见 `:85-96`）。
- **问题**：「谁持有活跃流」是**流式累积态的一等组成部分**：它决定"关闭面板后生成是否继续"。当前该状态在一个可能被卸载的组件实例的 ref 里，`unmount` 时无条件 `ctrl.abort()`。D15/R25 要求"关闭 = 隐藏，不卸载、**不中止生成**"，S03 §9.3 更明确"**流式累积态（content / reasoning / 工具步骤）与"当前会话"状态必须存放在 AppShell 级常驻 store**"。
- **影响**：
  1. **关闭面板路径今日行为正确**——`ChatPanel.tsx:130-131` 用 `if (!open) return null`（**提前返回，非条件渲染**），组件树位置不变、实例不卸载，`AppShell.tsx:188` 亦恒定挂载（`git log` 证明骨架期挂载后未改）。故"关面板不中止"当前成立（**但本 hook 的另一条路径已实证出竞态缺陷，见 [P0-1]**）。
  2. **该安全性依赖一个脆弱的隐式前提**，无任何守门：任何等价重构（① 父层改为 `{open && <ChatPanel/>}`；② 把 `<ChatPanel>` 移入路由/页面级；③ `useChatStream` 被提到 AppShell 以便复用发送逻辑）都会**静默**把"关面板不中止"变成"关面板即中止生成"——正是 out-of-scope.md §3 第 1 条明令禁止的场景，且不会有任何编译/测试报警。
  3. 与 D15 的字面要求不一致：状态归属应有**唯一正确答案**（store），而非"store 内容 + 组件 ref 控制器"的混合。**注意：本项与 [P0-1] 的修法天然交汇**——引入流序号令牌时若同时把令牌/控制器收敛到 store，可一并消解。
- **建议**：
  - 两条路线择一：
    - **(a)【低成本】代码结构不变，加"边界哨兵"注释 + 回归用例**：在 `ChatPanel.tsx:52` 与 `useChatStream.ts:71` 标注——"本 hook 的 ref 即『生成生命周期』，其安全性**依赖 ChatPanel 以 `return null` 而非条件挂载**；改为条件挂载将破坏 D15。" 并补静态守门（因无 DOM 环境，可退化为源码扫描断言：存在 `if (!open) return null` 且 `<ChatPanel` 未被 `&&` 包裹）。
    - **(b)【推荐，与 [P0-1] 合并修】结构改造**：把 `ctrlRef`/`abortedRef` 与流序号令牌一并下沉到 `chatStore`，`abort` 只由「切会话 / 删会话 / daemon 退出」触发。代价：触及 `ChatStore` 形状与 `useChatStream`，需回归全部用例——但 **[P0-1] 本来就必须引入令牌**，合并修可一次到位。
- **备注**：`useChatStream.ts:85-86` 的注释（"本函数不含 try/finally 之外的清理逻辑"）方向正确；但**跨组件生命周期**的结论在 `ChatPanel.tsx:9-11` 只有假设式表述（"一旦把累积态放进组件…"），未点明"控制器已部分落在组件 ref 中"。

### [P1-4] 已实现的 API 封装大面积无调用方（历史会话管理整体缺失）+ 死代码

- **位置**：`web/src/api/chatApi.ts:96/114/122/131/142/153/164`（`listConversations` / `createConversation` / `getConversation` / `patchConversation` / `archiveConversation` / `deleteConversation` / `clearConversations`）
- **证据**：全仓（`web/src/**`）grep 各函数名，**仅命中定义处**，无任何 import 或调用点。同理 `useChatStream.ts:173-175` 的 `editAndResend`、`:169-171` 的 `regenerate` 在 `ChatPanel.tsx` 中亦无调用（面板只用了 `send` / `abort` / `isStreaming`）。
- **问题**：`chatApi.ts` 的注释自述"12 个接口封装"（`+292`），但其中 **7 个会话 CRUD 接口全部没有调用方**；`regenerate` / `editAndResend`（R23/R24，设计中的 P0/P1）也无 UI 入口。
- **影响**：
  - 若是**有意分期**（SR-02 只交付"任意页面问答 + 来源引用 + 显隐 + 降级 + 隐私"五场景，会话管理与重生成留给 SR-03/SR-04）：**不构成缺陷，但返回说明里必须显式声明"会话列表/切换/归档/删除、重新生成、编辑重发未接入 UI"**，否则拼接期会被当成"已实现却调不通"。
  - 若是**漏接线**：R5（会话列表）、R7（归档/删除）、R23（重新生成）、R24（编辑重发）四项需求在本片未落地，而 `slice.md` §3 验收 1-4 全绿**无法暴露该缺口**（测试只驱动 URL 与纯逻辑，不驱动 UI 接线）——这是本片验收体系的结构性盲区。
- **建议**：由主 Agent 判定归属（属设计期批次划分问题，不属实现缺陷）。**无论如何，返回说明需补一条"已封装但未接线"清单**（7 个 CRUD + regenerate + editAndResend），并把 `void userAborted; void abortedEvent; void finishReason;`（`useChatStream.ts:125-127`）这类**显式吞值死代码**清理掉或接上用途。

### [P2-1] 中止后错误槽 1 秒内被清空 → S03 §5「保留已渲染内容，标记「连接中断」并给重试入口」实际不可达

- **位置**：`web/src/chat/useChatStream.ts:109-117` 与 `:97`
- **证据**：
  ```ts
  errorsByConv.delete(convId);            // :97  新流开始即清空
  } catch (err) {
    if (!ctrl.signal.aborted) {           // :111 ← 依赖浏览器对 abort 的判定 + 后端是否发 aborted 事件
      errorsByConv.set(convId, { code: 'STREAM_INTERRUPTED', message: …, retryable: true });
    }
  }
  ```
- **问题**：存在两条竞态窗口：
  1. **本地 abort 后重连**：若 `fetch` 抛的是 `TypeError: terminated`（而非 `AbortError`）或后端在 abort 后仍发出 `aborted` 事件，则 `ctrl.signal.aborted` 判定与 `errorsByConv.delete` 的时序取决于未定义行为——错误槽可能被写入又被下一轮流清空。
  2. **"失败 → 立即重发"**：错误槽写入后，任何新流都会先 `delete` 它（`:97`）；若 UI 依赖 `getStreamError(convId)` 显示"连接中断 + 重试"（`ChatPanel.tsx:130` 的提前返回同样影响错误可见性，见 §2.1-②），用户**几乎看不到**该标记。
- **影响**：S03 §5 的"流中断 → 标记 + 重试入口"退化为"静默保留部分内容"（内容是保留了，但**中断原因不可见**）。严重度 P2：真实网络中断时行为仍"不丢内容"，只是缺提示。
- **建议**：错误槽的清空时机改为"新流**成功收到首帧**后"或"用户显式关闭"，并在 `ChatPanel` 渲染 `getStreamError(state.activeConvId)`（含重试按钮）。同时建议补一条**真实中断**用例（现有 mock 只覆盖 `abortedFlow`，无"半途断流"）。

### [P2-2] 中止/错误事件已到达时，已生成部分仍被当作正常完成（与 P1-1 同源）

- **位置**：`web/src/chat/useChatStream.ts:103-107`
- **证据**：`if (ev.type === 'done' || ev.type === 'aborted' || ev.type === 'error') break;` → 三者共用一条收尾路径，`finally` 里只做 `streamEnd`（`:124`）。
- **问题**：`aborted` 与 `error` 终态与 `done` **不可区分**（`abortedEvent` / `finishReason` 被 `void` 掉）。`ChatMessage.finishReason` / `timing` / `usage`（`chatContract.ts:35-37`，冻结形状内已有）在流结束后也无人填充。
- **影响**：与 P1-1 同源（缺"中止/出错"的终态语义）；`finishReason`、`usage`、`timing` 三个字段成为**契约有、实现无**的死字段（`usage` 注释称"由 done 后重取会话详情获得"，但本片无任何重取逻辑，属 P1-4 同源的接线缺口）。
- **建议**：与 P1-1 一并修；若 `finishReason` / `usage` 确由后续片补齐，应在返回说明中显式列出"契约字段待填清单"。

### [P2-3] 窄屏降级阈值用 `window.innerWidth` 而非设计指定的 `ResizeObserver` + 主内容区宽度

- **位置**：`web/src/chat/ChatPanel.tsx:46`、`:106-112`
- **证据**：`const CHAT_DOCK_MIN_VIEWPORT = 1400;` + `onResize = () => setNarrow(window.innerWidth < CHAT_DOCK_MIN_VIEWPORT)`（监听 `window.resize`）
- **问题**：S03 §3.2 指定"**优先**用 `ResizeObserver` 观测 `ki-main` 的**实际宽度**，< 480px 即切浮层；视口阈值仅作兜底"。当前只用视口阈值，且在非 Browse 页（无 300px 文档栏）会按同一 1400 阈值**过早降级**为浮层——这正是 S03 明确否决过的做法。
- **影响**：非 Browse 页（总览 / 搜索 / 导入 / 写入）在 1200~1400px 宽度下本可常驻展示，现在会浮层覆盖内容。属体验取舍降级，非功能破坏。
- **建议**：`1400` 待校准的标注**已合规**（`ChatPanel.tsx:42-45`、`ki.css:1792` 均写明"阈值待前置门② 基线补测后校准"）——这一点无需整改。建议把观测源从 `window.innerWidth` 换为 `ResizeObserver(ki-main)`；若维持现方案，需在返回说明中登记"与 S03 §3.2 的偏差及理由"。

### [P2-4] 工具步骤只渲染最近一条 → `ProgressStep[]` 数组语义与 S05 §9.1 的"按时间序展示四类"不完全对齐

- **位置**：`web/src/chat/ChatPanel.tsx:328`（`const last = progress[progress.length - 1]`）、`:344-348`
- **证据**：`chatStore.ts:158-162` 的 `streamProgress` 是**追加**语义（数组累积），但视图只用 `progress[len-1]`，且仅在 `!content` 时显示。
- **问题**：`streaming.progress` 是完整时间序（✅ 符合 D15 存储要求），但 UI 只呈现最后一条。S05 §9.1 列出四类按时间序反馈：① 检索中 ② 已检索命中 N 条 ③ 思考中… ④ 正在作答…。
- **影响**：② 会被 ③/④ **立即覆盖**（`tool_end` 后若 reasoning 先到，用户看不到"命中 N 条"）；且 P2-4 的 `reasoning` 分支（`ChatPanel.tsx:307-308` 的 `progressStepLabel` 有 `case 'reasoning'`）**永远不会被走到**——`useChatStream.ts:230-233` 对 `reasoning` 事件只 dispatch `streamReasoning`，从不 dispatch `ProgressStep kind:'reasoning'`；同理 `kind:'answering'` 在全仓**无任何产生点**（`grep 'answering'` 仅命中 `chatStore.ts:27` 类型定义与 `ChatPanel.tsx:309` 渲染分支）。→ `ProgressStep` 三分支中两支是死分支。
- **建议**：若"只显示最新一步"是有意的降噪设计，应在返回说明中登记该取舍；同时清理或接上 `kind:'reasoning'` / `kind:'answering'` 两个死分支，避免后续误以为有实现。

### [P2-5] 消息数无上限保护（>500 条无降级提示，且无 `warning` 消费）

- **位置**：`web/src/chat/ChatPanel.tsx:177-190`（`state.messages.map` 全量渲染）；无 `warning` 处理
- **证据**：`grep -n ">500\|virtual\|conversation-too-long\|tool-rounds-exhausted" web/src/chat/*` → **无命中**。`chatContract.ts:91` 的 `done.warning?: 'tool-rounds-exhausted' | 'conversation-too-long'` 与 S03 §3.5「长会话 → 输入区上方提示"会话过长，建议新建会话"」在实现中均无对应物。
- **问题**：违反 out-of-scope.md §1「虚拟滚动（消息 >500 条）→ 仅提示新建会话」的最低承诺——**连提示也没有**。
- **影响**：超长会话下全量重渲染 + `MarkdownPreview`（marked + mermaid，S03 §3.3 实测单次 15–17ms）会造成明显卡顿；且用户无任何引导。同一会话中每条消息都是新的 `MarkdownPreview` 实例，无 memo 边界。
- **建议**：补 `warning` 消费 + 条数阈值提示（低成本）。虚拟滚动按设计**明确不做**，无需实现。

### [P2-6] 流式渲染无节流 → S03 §3.3 的"性能约束"未落实

- **位置**：`web/src/chat/ChatPanel.tsx:355-359`（流式分支直接 `<MarkdownPreview text={content} />`）
- **证据**：S03 §3.3 原文："`MarkdownPreview`（marked + mermaid）单次渲染实测 15–17ms，而流式每秒可达数十 chunk。渲染必须节流：**≥100ms 间隔或 `requestAnimationFrame` 合并**，仅渲染最新累积文本"。
- **问题**：`streamContent` 每帧 dispatch → `useSyncExternalStoreCompat` 强制重渲染（`ChatPanel.tsx:413-417`）→ 每 chunk 触发一次完整 Markdown 解析。
- **影响**：R11a 要求"每一秒都有可见反馈"已满足，但高速 chunk 下（每秒数十帧）会产生**渲染抖动 / 掉帧**，长回答尤甚。属性能风险，非功能缺陷。
- **建议**：对 `content` 做 `requestAnimationFrame` 合并或 100ms 节流（`chatContract.ts` 冻结形状不受影响）。

### [P2-7] `aborted` 事件后仍可能覆盖内容 + 新增用例未断言新缺陷

- **位置**：`web/src/chat/chatStore.ts:219-225`（`finalizeStream` 的"已存在同 id → 替换"分支）
- **证据**：`existing >= 0` 分支以 `content` 直接覆盖 `next[existing]`。
- **问题**：R23（`regenerate` 替换语义）与"`sources` 事件缓冲后 `aborted` 收尾"两种场景共用该分支。在中止路径下，若该 messageId 已存在（如 `meta` 早于 `streamStart`-替换的时序），会用**已生成部分**覆盖原消息，而非追加标记。
- **影响**：影响面窄（需特定事件时序），但属数据覆盖风险。同时，`e2e-sr02-sources.test.ts` 覆盖四条 mock 链路（正常/降级/检索不可用/中止），但**没有一条断言 `aborted` 标记**——这正是 P1-1 逃逸的原因（测试全绿，缺陷仍在）。
- **建议**：明确 `aborted` 收尾分支语义；补一条"用户中止 → `message.aborted === true`"的断言。

### [P2-8] `format.ts` 与 `chatContract.ts` 的 `DEGRADED_LABELS` 定义重复

- **位置**：`web/src/chat/format.ts:28-32` 与 `web/src/api/chatContract.ts:130-134`
- **证据**：两处 `Record<DegradedReason, string>` 字面量**逐字相同**（`'本次未使用工具检索'` / `'本次未检索'` / `'语义检索降级为全文'`）。`useChatStream.ts:22` import 的是 **`chatContract.ts`** 的版本（`useChatStream.ts:275-277`），而 `SourcesList.tsx:21` 从 **`format.ts`** 取 `formatLineRange` / `sourceRefTitle`。
- **问题**：同一份文案有两处 SSOT。`chatContract.ts:122` 自述"前端唯一来源，避免多处硬编码不一致"，现已出现第二处。
- **影响**：维护漂移风险（改一处忘另一处 → 降级文案不一致 → 违反 N17 的用户可区分性）。
- **建议**：`format.ts` 改为 re-export（`export { DEGRADED_LABELS } from '@/api/chatContract'`）或删除 `format.ts` 的副本。属低风险清理，**注意 `acceptance-sr02.test.ts:39-48`（禁改）可能断言该文案**，改前需核对。

### [P2-9] 来源引用未消费 `lineStart`/`lineEnd` → 点击回原文落在文档级而非命中行

- **位置**：`web/src/chat/ChatPanel.tsx:140-143`、`:246-255`；`web/src/components/ModuleDrawer.tsx:45-56, 69-102, 128, 218-219`
- **证据**：
  ```tsx
  // ChatPanel.tsx:140-143
  const handleOpenSource = (ref: SourceRef): void => {
    setViewing({ module: ref.doc, group: ref.group });   // ← 只透传文档名与 group
  };
  ```
  ```ts
  // ModuleDrawer.tsx:52-56
  function buildHighlightPattern(query: string): RegExp | null {
    const terms = splitHighlightTerms(query).map(escapeHighlightRegExp);
    return terms.length > 0 ? new RegExp(terms.join('|'), 'gi') : null;
  }
  ```
  `ModuleDrawer` 的 `highlightQuery`（`:128`）是"**按文本词高亮**"能力，**没有行号定位入参**；其行号相关道具（`DOC_HIGHLIGHT_CLASS` 等）只用于 `mark` 计数与循环跳转。
- **问题**：`SourceRef.lineStart/lineEnd`（契约明确 1-based、"为 0 表示只能定位到文档级"）未参与跳转，也未用于高亮词构造。
- **影响**：R20「可点击打开原文并**高亮命中**」当前实际兑现为"打开原文（文档级，无高亮）"。用户付出一次跳转，仍要自己找位置——对"核对来源"的核心价值打了折扣。**「复用既有 ModuleDrawer、不新建高亮机制」这一条已严格满足**（未改组件、未造新机制），本项属"复用深度"不足，不是越界。
- **建议**：两条低风险路线——(a) 把 `ref.snippet` 作为 `highlightQuery` 传入，可复用既有高亮机制做到"命中词高亮"，且**无需改 `ModuleDrawer`**；(b) 若必须精确到行，需回设计评估（`ModuleDrawer` 加行号道具属改既有组件，**按 out-of-scope.md §2 应报阻塞，不得自行改**）。**当前 `:246` 的 `key={scope:group:module}` 在切换到同一文档的另一条来源时不会重新挂载**，路线 (a) 需同时处理该 key。

---

## 2. 硬约束检查结论

### 2.1 D15 状态归属（★ 结论：**内容层合规，生命周期层不合规**）

> **结论前置**：**"关闭面板不丢内容"已满足**（有实测证据）；**"D15 要求的状态全部在 AppShell 级 store"仅满足内容部分**，生成生命周期（AbortController）仍在组件 ref 中（= P1-1 之外的 P1-3）。二者需分开裁决。

| 子项 | 结论 | 证据 |
|---|---|---|
| ① 流式累积态（`content` / `reasoning` / 工具步骤 `progress` / `degraded` / `sources`）是否在 AppShell 级 store？ | ✅ **是** | `chatStore.ts:36-56` 定义 `StreamingState`；`AppShell.tsx:72-74` 创建 store（`useRef` 惰性一次），`:188` 传 `<ChatPanel store={chatStore}/>`；组件内 `ChatPanel.tsx:55` 通过 `useSyncExternalStoreCompat(store)` 读取。**逐文件核对 `ChatPanel.tsx` 的 4 个 `useState`**：`config`/`configError`（`:57-58`，面板可用性，不随流式累积）、`draft`（`:59`，输入框文本，纯瞬时）、`reasoningExpanded`（`:61`，用户手动展开意图，非流式累积）、`viewing`（`:63`，来源跳转目标）——**无一承载流式累积态** ✅ |
| ② 关闭面板 = 隐藏不卸载？ | ✅ **是** | `ChatPanel.tsx:130` `if (!open) return null;`（**提前返回**，非条件挂载）→ 组件保持挂载于 `AppShell.tsx:188` 的固定位置；`:9-11` 注释明确"返回 null 不触发卸载"。⚠️ `:131` `if (fullscreenReader) return null;` 同理（**不卸载**，全屏阅读器场景亦不中止生成） |
| ③ 关闭面板不中止生成？ | ✅ **当前行为正确 / ⚠️ 机制脆弱** | 当前：`open=false → return null`，hook 未卸载 → `useChatStream.ts:71-80` 的清理不触发 → 不 abort ✅。脆弱点：该保证**完全依赖"提前返回"这一写法**，无任何代码级/测试级守门 → **P1-3** |
| ④ "生成中关闭面板 → 生成不中断、内容不丢"（`slice.md` §3 第 5 项）是否**有自动或人工验收**？ | ❌ **无自动验收；无人工验收脚本** | `e2e-sr02-sources.test.ts:343-356` 的 "D15 隐藏不丢" 只断言 **`chatReducer` 纯函数语义**（`chatReducer(mid,{type:'setOpen',open:false})`）——**不触及组件生命周期**（这正是 P1-3 逃逸的原因）。`acceptance-sr02.test.ts:50-63` 同样只测 reducer。**均无 DOM**，`ChatPanel.tsx:130` 的 `return null` 与 `useChatStream` 卸载路径零覆盖。`slice.md:34-35` 要求"没有前端测试基建则产出**人工验收脚本**（步骤 + 期望截图/输出）并标注"——**本次未见该脚本** ❌ |
| ⑤ `reasoning` 不落盘（D7） | ✅ **是** | `chatStore.ts:151-156` 只写 `streaming.reasoning`；`:210-213` `finalizeStream` 仅取 `content`/`sources`，不写 `reasoning`；`e2e-sr02-sources.test.ts:335-340` 有断言 `!('reasoning' in messages[0])` ✅。**注意**：本条实际胜过设计与 S05 §3.3/§9.2（原文"`done` 后随消息一起留在内存"）——实现把 reasoning 在 `streamEnd` 一并清空，使"刷新/切会话后不可回看"**自动成立**（D7 本意），方向上更安全 |
| ⑥ `ChatPanel` 内是否有累积型 `useState`？ | ✅ **无** | 见 ① 的逐项核对。`:9-11` 注释与实现一致，**未发现"拆包注释里描述的理想态缺失"** |

### 2.2 SSE 必须用 `fetch` + `ReadableStream`，禁止 `EventSource`

| 项 | 结论 | 证据 |
|---|---|---|
| 是否 `fetch` + `ReadableStream`？ | ✅ | `chatApi.ts:274-280`（`postSse`：`fetch` + `signal`）→ `:285` `readSseEvents`；`:188` `body.getReader()`，`:195` `await reader.read()` 逐帧产出（**真流式，非等整条读完**）✅ |
| 是否用 `EventSource`？ | ✅ **未使用** | `grep -rn "EventSource" web/src/` 仅命中 `chatApi.ts:6` 的"**不用**"注释（骨架期原文即如此）✅ |
| 是否支持中途 abort？ | ✅ | `chatApi.ts:279` 把 `signal` 透传给 `fetch`；`ReadableStream` 的 `read()` 在 abort 时抛 `AbortError` 由 `useChatStream.ts:109` 捕获 ✅ |
| 事件分派是否按 `data.type`（不使用 SSE `event:` 字段）？ | ✅ | `chatApi.ts:240-248` `extractDataPayload` 只取 `data:` 前缀行，注释明确忽略 `event:` / `id:` / 注释行 ✅ 对齐 `S03 §1` 与 `api/retrieval.md §1.1` |
| 三个生成接口是否共用解析？ | ✅ | `streamMessage` / `streamRegenerate` → `postSse`（`:303`、`:315`）；`streamEditMessage`（PATCH，`:335-345`）因方法不同单独 `fetch` 但**复用同一 `readSseEvents`** ✅ 符合 `chatApi.ts:266-267` 自述 |
| ⚠️ 偏差 | `streamRegenerate` 发 `{}`（`chatApi.ts:317`） | `api/retrieval.md:81` 写"请求体**无**（`{}` 可接受）"——**合规**，但需后端确实容忍 `{}`（`Content-Type: application/json` + `body:"{}"`）。已由 data-flow 测试覆盖，拼接期需对真实实现复验 |

### 2.3 其他硬约束

| 约束 | 结论 | 证据 |
|---|---|---|
| 逐帧 yield（不得等整条流结束） | ✅ | `chatApi.ts:192-219` `while(true)` 内 `yield ev`；`:291-292` 注释强调 R8/R11a 依据 |
| 跨 chunk 边界（一帧被切多块 / 多帧粘一块） | ✅ 且**有实测** | `chatApi.ts:190,198,201-211` 用 `buffer` 累积 + `findFrameEnd` 循环切帧；`:214-219` 流末冲刷残留帧。**`e2e-sr02-sources.test.ts:48` 以 7 字节分块强制跨帧**（`:42-47` 注释说明取值理由），断言事件序完整 ✅ —— 这是本次评审中**最强的一条验证证据** |
| 非法 JSON 帧跳过而非中断 | ✅ | `chatApi.ts:250-261` `parseEvent` try/catch + `typeof type === 'string'` 校验；`:182` 注释说明"单帧坏数据不应让整轮对话丢失" ✅ |
| `ReadableStream` 读锁释放 | ✅ | `chatApi.ts:220-227` `finally { reader.releaseLock() }`（带二次 try/catch）✅ |
| 单写者 / 新流前 abort 旧流 | ⚠️ **初版判"✅ 顺序正确"有误 → 更正为 ❌**，见 [P0-1] | `useChatStream.ts:134-148` `run()` 先 `streamStart` 再 abort `prev`：`dispatch` 虽同步，但旧流 `finally`（`:118-128`）的执行时机由事件循环决定，**语句顺序无法约束它**；且 `finally` 中 `streamEnd` **无条件**（`ctrlRef.current === ctrl` 只清 ref、不影响 dispatch）→ 旧流 `streamEnd` 会把新流累积态重置（`chatStore.ts:182-190` 置 `messageId=null`），新流收尾时被 `finalizeStream`（`:214`）整段丢弃。**已由 team-lead reducer 级实测证实（新流正文丢失）**，且**无任何测试覆盖** |
| `streamEnd` 必达（不卡"生成中"） | ✅ | `useChatStream.ts:86-87` 注释 + `:118-128` `finally` 无条件 `store.dispatch({type:'streamEnd'})` ✅ |
| 内存泄漏（listener 解绑） | ✅ | `chatStore.ts:264-269` `subscribe` 返回取消函数；`ChatPanel.tsx:415` 的 `useEffect` 返回它 ✅ |
| `useEffect` 依赖 | ✅ 正确 | `:415` `[store]`（stable）；`:67-83` `[]`（带 `alive` 守卫）；`:86-91` 依赖 `open`/`messages.length`/`content`/`progress.length`；`:107-112` `[]`（带 removeEventListener）；`:121-127` `[open]`（带 clearInterval）。**逻辑上有一处浪费**：`:121` 的 500ms 轮询在 `open=true` 时永久驻留（见 §5 第 5 项） |
| React 闭包 / 陈旧 state | ✅ 无问题 | `useChatStream.ts:150-190` 用 `store.getState()` 实时读（而非捕获渲染期快照，`:158`）；`ChatPanel.tsx:137` 的 `state.activeConvId ?? ''` 每次渲染取新值 ✅ |
| `setNarrow` 的 SSR 兼容 | ✅ | `ChatPanel.tsx:107-109` `onResize()` 先立即调用一次，避免首帧误判（本应用无 SSR，非问题） |
| 无虚拟滚动 / 无消息上限 | ❌ 见 P2-5 | — |

---

## 3. 红线检查结论

### 3.1 越界 / 契约漂移

| 检查项 | 结论 | 证据 |
|---|---|---|
| 是否修改 `web/src/api/chatContract.ts` 字段形状？ | ✅ **未改**（diff 为空） | `git diff --stat freeze/... HEAD -- web/src/api/chatContract.ts` → 空输出。文件内容与冻结形状逐字段一致（`chatContract.ts:19-134`） |
| 是否修改 `web/src/components/**` 既有组件？ | ✅ **未改**（diff 为空） | `git diff --stat freeze/... HEAD -- web/src/components/` → 空输出。`ModuleDrawer.tsx` / `MarkdownPreview.tsx` **零改动**，仅被 import 复用（`ChatPanel.tsx:27-28`）✅ |
| 是否越界改 `src/**`？ | ✅ **未改**（diff 为空） | `git diff --stat freeze/... HEAD -- src/` → 空输出。`src/lib/chat/chat-contract.ts` 的 3 行改动（`git diff` 已核）属 **SR-01 分支的历史提交**，不在本片改动内；且仅为注释重写（移除完整桩标记字面量），**未触及任何类型定义** ✅ |
| 是否越界改 `design/**`、`api/**`？ | ✅ **未改**（diff 为空） | `git diff --stat freeze/... HEAD -- design/ api/` → 空输出 |
| 是否改片级验收断言？ | ✅ **未改**（diff 为空） | `git diff --stat freeze/... HEAD -- test/chat/contract-parity.test.ts test/chat/data-flow.test.ts test/chat/acceptance-sr02.test.ts` → 空输出；三个测试实跑全绿 |
| 全部改动是否落在 ownership 独占写区？ | ✅ **是** | `git diff --name-only freeze/... HEAD -- web/` → `api/chatApi.ts` / `chat/ChatPanel.tsx` / `chat/SourcesList.tsx` / `chat/chatStore.ts` / `chat/useChatStream.ts` / `styles/ki.css`。对照 `ownership.md:13-18` exclusive 清单：前 5 个直接命中；`styles/ki.css` 属设计/需求（`requirement.md:184`、`S03 §3.1`）明确的改动面（`S03 §6` 亦登记"新增面板样式与媒体查询"） |
| `AppShell.tsx` 是否越界大改？ | ✅ **未改**（骨架期已挂载） | `git log -1 -- web/src/layouts/AppShell.tsx` → `0251472`（骨架落地，2026-09-25 22:51）；`git show freeze/...:web/src/layouts/AppShell.tsx \| grep` → 骨架期**已含** `createChatStore`（:10/:72-74）、顶部开关（:168-175）、`<ChatPanel/>`（:188）。实现期**零改动**，绝对满足"只改挂载位"✅ |
| `ki.css` 是否为纯追加？ | ✅ **是** | `git diff ... \| grep "^@@"` → 唯一 hunk `@@ -1473,3 +1473,336 @@`；`1487-1808` 全部为新增（注释 `:1481` 明确"不得修改上方任何既有规则"）✅ |
| 图标 / 挂载位置是否符合设计？ | ⚠️ 偏差（未越界） | `AppShell.tsx:174` 开关图标为 **`◨`**，`S03 §9.3` 表格中的同款描述为 **`◑`**。`change-report` 说明该选择系因 `◑` 与主题切换按钮视觉混淆。**属 S03 自身的内部不一致（§9.3 用 `◑`、§3.2 只写"由 data-mode 决定"）** → 建议在 S03 §9.3 补一句"图标最终取 `◨`（避免与主题按钮混淆）"以消歧，避免后续被当缺陷回滚。**不阻塞交付** |
| 桩残留 `STUB:SR-02` | ✅ **清零** | `grep -rn "STUB:SR-02" web/src/` → 无输出（exit=1）。骨架期存在（`ChatApiError` 构造器等），实现期已全部移除；`SourcesList.tsx` 的 `data-stub="SR-02:SourcesList"` 也已删除（`git diff` 确认 ±1 行）✅ |
| 生产代码引用 `.delivery/mocks/`？ | ✅ **无** | `grep -rn "\.delivery/mocks" web/src/` → 无输出（exit=1）。mock 仅在 `test/chat/e2e-sr02-sources.test.ts:39` 的测试侧 import（**合法**，属 readonly 复用的 mock 套件）✅ |

### 3.2 mock 保真边界（"mock 只证形状不证行为"）

| 检查项 | 结论 | 证据 |
|---|---|---|
| 是否有把 mock 结果当"真实行为"的表述？ | ✅ **未发现** | `e2e-sr02-sources.test.ts:4-23` 明确写"用**真实 HTTP + 真实 SSE 分块**驱动"、"唯一能发现它的方式是**跑真实链路**"；`:44` 自承"mock 只兑现事件类型与顺序"；文件名/描述均未越界声称 |
| 是否有"已运行验证通过"的过度声明？ | ✅ **未发现** | 源码注释中检出的声明均与实跑结果吻合（`tsc --noEmit` 退出 0、四个测试全绿 §0）。**唯一需要补强的**是"第 5/6 项已验收"类表述**不存在于代码中**，但 `slice.md` 要求的人工验收脚本亦缺失（见 §2.1-④） |
| mock 自身是否真实验证来源引用点击？ | ❌ 见 §7 | `e2e-sr02-sources.test.ts:266-300` 只断言 `state.messages[0].sources` 数据结构（`group`/`doc`/`lineStart`/`lineEnd`/`snippet`），**不验证"点击 → 打开 ModuleDrawer → 高亮"**（无 DOM，`ChatPanel.handleOpenSource` 零覆盖） |

---

## 4. 语义一致性结论（与契约 / 设计的对齐）

### 4.1 事件类型与分派（`ChatEvent` 联合类型 11 类）

`useChatStream.ts:201-255` 的 `switch` 覆盖 **11 类全部**（`meta` / `tool_start` / `tool_end` / `sources` / `degraded` / `reasoning` / `content` / `usage` / `done` / `aborted` / `error`），与 `chatContract.ts:77-94` / `CHAT_EVENT_TYPES`（`:96-99`）/ `api/retrieval.md:25-37` 一一对应。**未发现问题**（有 `e2e-sr02-sources.test.ts:363-382` 的"11 类无遗漏"自检断言）。

| 事件 | 契约字段（`api/retrieval.md §1.1`） | 前端消费 | 结论 |
|---|---|---|---|
| `meta` | `{conversationId, messageId, model, discardedCount?}` | `:205` `streamStart{messageId}`（重置累积态为后端真 id）；`conversationId`/`model`/`discardedCount` 未消费 | ⚠️ `discardedCount` 无消费 → `chatApi.ts:325` 注释要求"UI 应在操作前提示将丢弃其后 N 轮"，**该提示未实现**（关联 P1-4：`editAndResend` 无 UI 入口）。`model` 由 `getChatConfig` 单独获取（`ChatPanel.tsx:154`），**冗余但无冲突** |
| `tool_start` | `{name, query, mode}` | `:208-213` → `toolStartStep(mode)`（`fulltext` / 其它分别给文案）；`name` / `query` 未用 | ✅ 对齐 `S03 §9.1`（`mode` 决定全文/语义文案） |
| `tool_end` | `{hits, durationMs, error?}` | `:215-220` → `toolEndStep(hits, error)` | ✅ 对齐 `S07 §3.5`、`api/retrieval.md:54`（"抛错也必须发 `tool_end`，带 `error`"—— 前端 `:265` 已处理 `error` 分支） |
| `sources` | `{sources: SourceRef[]}` | `:222-224` → `streamSources`（缓冲） | ✅ 结构对齐 `api/retrieval.md §1.3`（`group`/`doc`/`lineStart`/`lineEnd`/`snippet`）；`lineStart===0` 的文档级语义由 `format.ts:16-20` 处理（`SourcesList.tsx:45` 不渲染行号）✅ |
| `degraded` | `{reason, message}`，`reason ∈ 3 类` | `:226-228` → `degradedMark(reason, message)`（`:275-277` 优先用后端 `message`，缺失回退 `DEGRADED_LABELS`） | ✅ 对齐 `S03 §9.1` 三类文案、`S07 §3.7`；"至多一次、后到不覆盖先到"由 `chatStore.ts:164-170` 的 `?? action.mark` 保证 ✅；**N17 可见性**由 `ChatPanel.tsx:333-337`（`role="status"`）保证 ✅ |
| `reasoning` | `{text}` | `:230-233` → `streamReasoning`（**仅内存**） | ✅ 对齐 `S05 §3.3`/D7。⚠️ 但**收敛于"仅流中"**（`streamEnd` 清空），与 S05 §9.2"重开可继续看到累积内容"仅覆盖"生成期间关面板"，**生成完成后关面板再重开则思考块消失**——与 D7 一致（"切会话/刷新即失"），但与 S05 §3.2"`done` 后保留在内存（本次页面生命周期内仍可展开）"**不一致**。**实现方向更安全**（更强的不落盘语义），建议视为设计文本偏差登记，而非缺陷 |
| `content` | `{text}` | `:235-237` → `streamContent`（追加） | ✅ 逐帧追加，`chatStore.ts:144-149` ✅ |
| `usage` | `{promptTokens, completionTokens, reasoningTokens?}` | `:250-253` **不处理** | ⚠️ 未落 `ChatMessage.usage`（`chatContract.ts:37`）；注释称"由 done 后重取会话详情获得"但**无该重取逻辑** → 见 P2-2 |
| `done` | `{messageId, finishReason, sources, warning?}`，**`done.sources` 为权威副本** | `:239-244` 用 `ev.sources` 兜底 dispatch；`finishReason` / `warning` 未消费 | ⚠️ `finishReason` → P2-2；`warning` → **P2-5**。`done.sources` 兜底逻辑**正确且有测试**（`e2e-sr02-sources.test.ts:275-283`）✅ |
| `aborted` | `{messageId}` | `:250-253` **不处理**（`abortedEvent=true` 后 `void`） | ❌ → **P1-1** |
| `error` | `{code, error, retryable?}` | `:250-253` **不处理**（丢给 `consume` 的 catch）；HTTP 层错由 `chatApi.ts:42-51` → `ChatApiError`（保留 `code`） | ⚠️ 流内 `error` 事件的 `code`/`retryable` **未被写入错误槽** → S03 §5"按 `code` 映射文案；`retryable` 决定是否给重试按钮"未兑现 → 见 P2-1/P2-2 |
| 事件顺序约束（`api/retrieval.md §1.2`） | 正常序 / 降级序 / 纯对话序 | **不做重排**（`chatStore.ts:145` 注释"前端按到达顺序渲染，不做重排"） | ✅ 与 `:58`"事件顺序由 daemon 保证"一致。`e2e-sr02-sources.test.ts:241-254` 断言了正常序 `meta→tool_start→tool_end→reasoning→content×2→sources→usage→done` **逐项精确** ✅ |

### 4.2 `sources` 缓冲生命周期（本次实跑修复的关键缺陷）

`chatStore.ts:48-55, 172-180, 210-240` 采用"**先缓冲 `streaming.sources`，`streamEnd` 一次性并入 `messages`**"，并在 `streamSources` 时对**已存在**的同 id 消息**同步**挂上（`attachSources`，`:195-202`）。

**结论**：✅ **设计正确且被实测证据支撑**。理由链完整——`sources` 事件到达时本轮 assistant 消息尚未并入 `messages`（`e2e-sr02-sources.test.ts:285-294` 的"停在 sources 时 `messages.length===0`"断言**直接证明了该时序**），直接挂会静默丢失；`done` 事件提供权威兜底（`:239-244`）。`finalizeStream` 的双分支（替换 / 新建）与 `merged` 处理（`:217`）亦覆盖了"空来源不得产生空数组"（`:296-299` 有断言）✅

### 4.3 降级可见性（N17）

- `streamDegraded` → `ChatPanel.tsx:333-337`（`role="status"`，**气泡顶部显式标注**）✅ 对齐 `S03 §9.1`"气泡顶部显式标注"
- 文案回退链完整（事件 `message` → `DEGRADED_LABELS`），**"标记必须可见"不依赖后端是否填文案**（`useChatStream.ts:272-274` 注释自述）✅
- `acceptance-sr02.test.ts:39-48`（禁改，已跑绿）覆盖"三类文案齐备"+"本次未检索/未使用工具检索可区分" ✅
- 未配置模型时 **fail-loud**（`ChatPanel.tsx:158-164` 横幅 + `configPath` + `reason`；输入区 `:215` disabled）✅ 对齐 R12 / S03 §3.5 / §5

### 4.4 与 `chatContract.ts` 冻结形状的字段级一致性

`ChatMessage` / `ConversationFile` / `ConversationSummary` / `ChatConfigOk` / `SourceRef` 在 `chatApi.ts` 的返回类型中逐字段引用契约类型（`:16` import），**未自行造形状、未硬编码事件字段** ✅（对照 `out-of-scope.md §3` 第 3 条"为了跑通而在前端硬编码事件字段"——**未发生**）。`contract-parity.test.ts` 实跑 **10/10 绿** ✅

---

## 5. 未覆盖 / 不确定项（需人工确认）

| # | 项 | 说明 | 建议确认方式 |
|---|---|---|---|
| 1 | **`slice.md` §3 第 5 项（D15 显隐不丢）无任何自动或人工验收** | `e2e-sr02-sources.test.ts:343-356` 只测 `chatReducer` 纯函数；`ChatPanel.tsx:130` 的 `return null` 与 `useChatStream` 卸载路径**零覆盖**；`slice.md:34-35` 要求的"人工验收脚本（步骤+期望输出）"**未见交付** | 需人工验收：生成中关闭面板 → 观察网络面板 **SSE 连接仍在**、重开内容完整、无 `abort` 请求 |
| 2 | **`slice.md` §3 第 6 项（来源引用点击回原文）无 DOM 级验证** | `handleOpenSource`（`ChatPanel.tsx:140-143`）在测试中零覆盖；e2e 只断言 `sources` 数据结构 | 人工：点击来源 → 确认 `ModuleDrawer` 打开、原文正确、命中高亮（当前预期**高亮缺失**，见 P2-9） |
| 3 | **`ChatPanel` 在 `AppShell` 中被提前返回，但 `useChatStream` 仍持有活跃流** | 有测试的因果性极弱（`:343-356` 测的是 reducer 而非生命周期） | 见 P1-3 建议 (a) 的"边界哨兵 + 静态守门" |
| 4 | **`aborted` / `error` 事件的 `messageId` / `code` / `retryable` 未消费** | `:250-253` 与 `consume` 的 catch 均未落地"错误态 + 重试入口" | 见 P1-1 / P2-1 / P2-2 |
| 5 | **`useEffect`（`:121-127`）500ms 轮询在 `open=true` 时永久驻留** | `document.querySelector` 每 500ms 全文档扫描（且 `setFullscreenReader` 每次赋同值不触发重渲染，故**无渲染开销**，但仍是常驻定时器）。作用域限定在 `open` 内，**关闭面板即停**，故不是泄漏 | 可优化为 `MutationObserver` 观测 `.ki-shell` 的 `class` 变化（当前属可接受实现） |
| 6 | **`ChatPanel.tsx:216` 的"不标记 `data-ki-search-input`"注释与 `AppShell.tsx:88` 的 `querySelector` 实际行为不符** | 实际选择器为属性选择器 `'[data-ki-search-input]'`（非类选择器），`className="ki-chat-panel__input"`（`:211`）**本来也不会命中**。注释结论（Ctrl+F 不受影响）**正确**，但推理前提不成立 | 建议修正注释措辞（原文"不能标类名"→ 实为"没有也不应加该属性"）。仅文档准确性问题 |
| 7 | **`maxToolRounds` / `requestTimeoutMs` / `baseURLHost` / `retrievalEnabled` / `supportsTools` 未消费** | `ChatConfigOk` 这些字段在 `ChatPanel` 中无使用。`supportsTools` 是"走哪条检索路径"的正交状态（`chatApi.ts:75` 注释），前端选择路径而非**仅渲染后端 `degraded` 事件**，可能已够用 | 属语义/设计取舍，建议在返回说明中登记"哪些 config 字段被有意忽略" |
| 8 | **`error` 事件后 `streamEnd` 仍会把已生成部分并入 `messages`（`aborted:false`）** | 与正常 `done` 外观一致 → 用户无法区分"出错中断"与"正常完成" | 与 P1-1 / P2-2 一并处理 |
| 9 | **本片未实现的历史会话管理（`listConversations` 等 7 个接口 + `regenerate` / `editAndResend`）归属未明** | 影响 R5 / R7 / R23 / R24 与 `slice.md` §1 目标中的"历史会话管理" | 由主 Agent 判定属后续片或漏接线，并写入返回说明 |
| 10 | **图标 `◨` vs 设计 `◑`** | 见 §3.1 | 建议补 S03 §9.3 消歧，非代码问题 |

---

## 6. 总体判定

> **v2 修订说明（2026-09-26）**：初版判为 **[P1-3]** 的"并发安全"一条，经 team-lead 独立复核并提供 **reducer 级实测**后，**升级为 [P0-1] 实证竞态缺陷**（`streamEnd` 无条件重置新流累积态 → 新回答整段丢失）。初版中"单写者顺序正确 ✅"的结论**已被推翻并更正**（见 §1 [P0-1] 与 §2.1 对应行）。生命周期状态归属部分**结论维持**，降级为 [P2-10]。总体判定因新增 P0 而调整（见下）。

### **有条件通过（v2：因新增 [P0-1] 而收窄）**

**理由**：本片在**两条硬约束的实质要求上均已达标且有强证据**——① D15 的内容层（流式累积态全部落在 AppShell 级 `chatStore`，`ChatPanel` 的 4 个 `useState` 经逐项核对**无一承载累积态**，"关闭 = 隐藏不卸载"由 `ChatPanel.tsx:130` 的**提前返回**保证且当前行为正确）；② SSE 用 `fetch + ReadableStream`，**无 `EventSource`**，跨 chunk 边界解析有 7 字节切帧的实测证据（`e2e-sr02-sources.test.ts` 14/14 绿），且 `sources` 缓冲生命周期这一"形状断言与单测结构性覆盖不到"的缺陷已被真实链路测试钉住。红线检查**全部通过**：契约形状未改、既有组件未改、`src/**` 未碰、禁改断言未动、`AppShell.tsx` 实现期**零改动**（骨架期已挂载）、`ki.css` 纯追加、桩残留清零、无 mock 泄漏；四个只读命令实跑 `tsc --noEmit` exit=0、`e2e 14/14`、`acceptance 10/10`、`contract-parity 10/10`、`data-flow 7/7` 全绿。

**未达无条件通过的四条硬理由**（均需主 Agent 裁决归属后再定去向）：

1. **[P0-1]**（v2 新增）：**并发流互踩导致新回答整段丢失**——`run()` 中 abort 旧流后，旧流 `finally` 的**无条件** `streamEnd` 会把新流累积态重置（`messageId=null`），新流收尾时被 `finalizeStream` 丢弃。触发场景为"检索进行中切会话 / 重新生成"，**已被 reducer 级实测证实**，且 **e2e 四条 mock 链路全为单流、零并发覆盖**。属**用户可见数据丢失**，建议列为拼接前必修（修法见 [P0-1] 建议 1：流序号令牌）。
2. **P1-1**：R9 明确要求的「已中止」标记**不可达**（`aborted` 事件被 `void` 吞掉 + `finalizeStream` 恒写 `aborted:false`），属**需求未达成**而非风格问题；
3. **P1-2**：T12 隐私确认**只有阻塞、没有确认入口**（`ackDisclosure` 零调用方）→ 触发时面板硬阻塞且无自救出口；
4. **[P2-10] + §5-1/2**：D15 的**生命周期层**（谁持有 AbortController）仍靠"组件不卸载"这一脆弱隐式前提，且 `slice.md` §3 第 5/6 项**既无自动断言、也未见要求的人工验收脚本**——即"验收方式"本身未交付。

**放行建议**：**[P0-1]、P1-1、P1-2 建议在拼接前修**（[P0-1] 与 [P2-10] 可合并修——引入流序号令牌时一并把令牌/控制器收敛到 store，一次到位）；[P2-10] 与 §5-1/2 建议以"**边界哨兵注释 + 静态守门 + 人工验收脚本**"补足；[P1-4] / 其余 P2-x 建议**登记为已知项/后续片范围**并在返回说明中显式列出"已封装但未接线"与"契约字段待填"两张清单，避免拼接期被误判为"已实现却调不通"。

**另需注意的验收体系盲区（v2 补充）**：[P0-1] 与 [P1-1] 有一个共同成因——**现有验收体系只驱动"单流 + 纯逻辑"，不驱动"并发/交错时序"与"组件生命周期"**。`e2e-sr02-sources.test.ts` 虽在"真实 HTTP + 真实分块"上做到了很强，但其四条 mock 链路**均为单流**；`acceptance-sr02.test.ts` 与 e2e 的 D15 用例都只调 `chatReducer` 一次。建议在返回说明中登记"**并发时序**"为一类需专门覆盖的用例类型（可直接驱动 reducer 构造交错时序，无需 DOM）。

---

## 附：评审方法说明

- GitNexus MCP 对本仓库**不可用（未索引）** → 全部结构关系结论以 `grep`（`search_content` / shell `grep`）+ 源码直读取证，符合工作规则的降级要求。
- 每条结论均给出 `文件:行号`；**区分【静态检查发现】与【实际运行验证】**——§0 表中标注"完成/无输出/exit=N"的条目为实跑；未跑的命令（如 `npx vite build`）**未声称通过**。
- **本次未修改任何代码/文件**，未执行任何 git 写入操作。
