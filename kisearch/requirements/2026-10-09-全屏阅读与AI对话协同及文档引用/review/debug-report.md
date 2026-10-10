# 排查报告：AI 对话框「答非所问 / 复述错乱」（引用功能回归）

- 日期：2026-10-09
- 需求：REQ-20261009-002（需求 B · 输入框引用文档段落）
- 触发：用户走查发现 —— 问「什么是Deployment 对象？」（带引用），AI 却重复回答了上一轮「这个命令的含义是啥」；
  追问「我刚才问你的问题是什么？原封不动复述一下」，AI 复述出的是**上上轮**的问题。

## 1. 现象（用户侧原文）

1. 会话 `k8s/c-mv0wfipg-tm6v`：
   - `m5` 用户问「什么是Deployment  对象？」（带 1 条引用）→ `m6` 回答的却是 `kubectl create deployment` 这条命令的用法（= 上一轮 `m3` 的答案内容）；
   - `m7` 问「我刚才问你的问题是什么？」→ `m8` 复述「上一条是『这个命令的含义是啥』；再往前是『ReplicaSet  是个什么东西』」，**跳过了 m5**。
2. AI 的「思考过程」暴露了模型的困惑：
   - m6 轮：「最后一条是 assistant 的回答」「实际上当前待回答的 user 消息是『这个命令的含义是啥』」；
   - m11 轮（用户"编辑重发"后）：「the most recent user message … there's no new user message text shown」。

## 2. 证据链

| # | 证据 | 来源 |
|---|---|---|
| 1 | **磁盘会话数据完全正确**：`m1..m8` 消息交替、内容与时间戳均正常；`m5` 落盘内容为「什么是Deployment  对象？」且带 refs | `/root/chat/k8s/c-mv0wfipg-tm6v.json` |
| 2 | **后端构造的上游 messages 完全正确**：历史 m1/m2/m3/m4/m5 全在、末条恒为本轮 user（用 mock 上游捕获真实请求体，8 条：3 system + 5 历史/本轮） | `temp/repro-chat-history.ts` |
| 3 | 无历史裁剪逻辑（`CONVERSATION_TOO_LONG=500` 仅为告警阈值）；daemon 代码版本 = 当前 HEAD（chat 相关文件无未提交改动，mtime 早于 daemon 启动 19:37） | 代码 + `git status` |
| 4 | **真上游复现成功**：复刻 m5 那轮（历史 m1..m4 + 本轮 user=m5 + 引用）→ thinking 复现同款错乱（"最后一条 user 是空的"、`user: (空？)`），首轮检索 query 被带偏成「kubectl create deployment 命令式 不幂等」 | `temp/repro-real-upstream.ts` 场景 A |
| 5 | **对照实验（唯一变量：引用块）**：同历史同问题、**不带引用** → thinking 完全正常，准确锁定「什么是 Deployment 对象」 | 同上，场景 B |
| 6 | **位置是决定性的**：引用块仍是 system 但挪到历史之后 / 本轮 user 之前 → 正常；引用并入末条 user（问题在前）→ 正常；引用并入 user 但**问题在后** → 仍错乱（引用正文淹没问题） | `temp/repro-refs-placement.ts`、`temp/repro-refs-placement2.ts` |

## 3. 根因

```text
{现象：问「什么是Deployment 对象」→ AI 复述/回答上一轮问题}
  ▼
{引用块以**独立 system 消息**注入到 system 组（历史之前）}
  ▼
{上游把该 system 块当成"最新的用户输入"（thinking 反复出现"最后一条 user 是空的 / 最后一条是 assistant"）}
  ▼
{根本原因：引用注入位置与模型的对话结构预期冲突}
  ├─ 触发条件：本轮带引用（`refs` 非空）
  ├─ 放大条件：引用片段与上一轮话题同源（kubectl 命令贯穿两轮）→ 更易被"接上上一轮"
  └─ 引入点：REQ-20261009-002 需求 B（2026-10-09）
```

- **不是**消息丢失、**不是**历史裁剪、**不是**会话存储/并发问题（证据 1–3 已逐一排除）。
- 该模型的 thinking 会主动"重读对话结构"；当 system 组里多出一条长引用块时，它把该块误认为最新的用户输入 → 判定"最后一条是 assistant / user 为空" → 输出接续上一轮。

## 4. 修复（最小改动）

`src/lib/chat/retrieval/tool-loop.ts`：

- 引用块**不再作为 system 消息**，改为**并入本轮 user 消息末尾**（`withRefsBlock`）：
  - 顺序固定「**问题在前、引用附后**」（对照实验：顺序颠倒仍会错乱）；
  - 命中「末条即本轮 user」守卫时**就地替换**该条，不追加新消息（避免出现连续两条相同 user —— 那会让模型复述提问）。
- `renderRefsBlock` 保留渲染逻辑（文档定位 + 编号围栏 + 软提示 + 提示注入缓解措辞），仅改注释说明修订原因。
- `buildUpstreamMessages` 的不变量「返回数组末条恒为本轮 user」**未变**，`degradedPath` 的 splice 语义不受影响。
- 契约注释同步：`src/lib/chat/chat-contract.ts`（`ChatRef` 生效方式 + 批次边界变更登记）、`web/src/api/chatContract.ts`（前端副本登记，**形状/常量未变**）。

**用户可见行为**：引用语义（软提示：优先依据、仍可检索全库）、落盘、标签回显、上限校验**全部不变**；只有发往上游的消息组织方式变了。

## 5. 验证（均实跑）

| 项 | 结果 |
|---|---|
| `test/chat/chat-refs.test.ts`（断言改为「并入末条 user」+ 新增 2 条回归锚点：不得留在 system、命中守卫分支不得出现两条 user） | **16/16 通过** |
| `npm run test:chat`（22 个文件全量） | **EXIT=0，0 失败** |
| `npx tsc -p tsconfig.json --noEmit` | 仅 2 条**基线已有**错误（`import-budget.ts`、`mcp-http.ts`），**chat 相关新增 0** |
| Web `npx tsc --noEmit` | **EXIT=0** |
| **端到端真上游复跑 m5 轮**（修复后） | thinking 正确识别「what is a Deployment object?」，**症状未复现**；工具调用 query 正常（`Deployment 是什么 无状态应用…`） |

证据脚本（`temp/`）：`repro-chat-history.ts`（后端构造正确性）、`repro-real-upstream.ts`（复现）、
`dump-upstream-msgs.ts`（取样本）、`repro-refs-placement.ts` / `repro-refs-placement2.ts`（定位）、
`verify-refs-fix-e2e.ts`（修复验证）。

## 6. 影响面与遗留

- **需重启 daemon 生效**（模块在启动时加载；本次修复不涉及配置/数据迁移）。
- 受影响文件：`src/lib/chat/retrieval/tool-loop.ts`、`src/lib/chat/chat-contract.ts`（注释）、
  `web/src/api/chatContract.ts`（注释）、`test/chat/chat-refs.test.ts`。
- **未完成/待观察**：
  1. 其他上游（非 qwen3.8-flash 的 OpenAI 兼容网关）对「user 内嵌引用」的接受度未逐一验证（该形态是业界通行做法，风险低）；
  2. `default` scope 旧会话 `c-muo0kmds-tfq7.json` 里 09:46–10:48 的「引用正文为空 / 只有省略号」现象属**另一条线索**（当时的引用内容为空，可能是修复前版本的抓取问题），本次未处理；
  3. 该模型 thinking 在长历史下仍会自我纠偏（修复后 m11 轮仍见"let me re-read"），属模型行为、非本仓库缺陷。
