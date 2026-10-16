---
id: REQ-20261015-001
feature: AI对话证据回放与工具预算可配
document_type: review
version: 1
created: 2026-10-15
author: AI
---

# 代码审查记录（auto-review → code-review 自查）

- **审查对象**：工作区未提交改动 —— 16 个已有文件（+387/−35）+ 5 个新文件（`replay.ts` / `toolBudget.ts` / 3 个测试）
- **审查方式**：code-review 七维度自查（设计级审查已由 `design-review` / `challenger` / `scenario-rehearsal` / `demo-verify` 分别覆盖）
- **执行证据**：后端 `npm run test:chat` → **27 文件 / 314 测试全绿**；前端 `npm test` → **288/288**；`tsc`（src 与 web，仅 2 条基线错误）；`vite build` exit=0

## 维度结论

| 维度 | 结论 | 依据 |
|---|---|---|
| 0 语义一致性 | ✅ | 三子需求均与设计一致；3 条实现偏差已记 `plan.md`；**末条不变量 / 注入点 / 默认回落**均由测试锁定 |
| 1 安全 | ✅ | 无新增注入面；证据块沿用既有提示注入缓解声明；无硬编码凭据（`git diff` 扫描 0 命中） |
| 2 Bug 风险 | ⚠️ → ✅ | 见下表 3 项（已修复） |
| 3 规范 | ✅ | 命名 / 类型 / 注释齐全，关键处含根因说明 |
| 4 架构 | ✅ | SSOT 清晰：预算常量在 `chat-contract`、limit 知识在 registry、纯逻辑在 `web/src/lib/toolBudget.ts`；回放为独立模块 + 结构化类型 |
| 5 性能 | ⚠️ → ✅ | 计数口径统一为码点（见下表 3）；回放遍历 O(messages) 可忽略 |
| 6 测试 | ⚠️ → ✅ | 新增 28+ 用例；补齐 E5 端到端断言（见下表 4） |

## 发现与修复（4 项，均已修复并复跑全绿）

| # | 级别 | 问题 | 修复 | 验证 |
|---|---|---|---|---|
| 1 | P1 | `safeReplayItems` 的 catch 分支**无测试覆盖**（脏结构降级未被锁定） | ① `collectReplayItems` 入口加 `Array.isArray` 防御（与 try/catch 双保险）；② 新增「脏结构不抛错」用例 | `evidence-replay` 新增用例通过 |
| 2 | P2 | 截断时若剩余空间不足标记长度，截断条会**超预算 ≤11 字符** | `keep <= 0` 时整条丢弃并停止（不超预算） | 新增「不超预算」断言用例 |
| 3 | P2 | 回放按 UTF-16 `length` 计数，与 `serializeToolResponse` 的**码点**口径不一致（emoji 算 2） | 统一 `Array.from` 码点计数 + 按码点切片（不切代理对） | 新增 emoji 用例（断言无 `\uFFFD`） |
| 4 | P0（护栏 E5 缺口） | 缺「执行层收到配置值」的**端到端**断言 | 新增 `test/chat/tool-budget-injection.test.ts`（真实 `runToolLoop` + mock 上游；配置 `searchHitsPerCall: 8` → fixture 收到 `limit=8`；未配 `toolResponseChars` → `tool_end.response.limit=10000`） | 该测试 1/1 通过 |

## 搭车变更审计（维度 0.10）

**无搭车变更**。`contextUsage.ts`（2 处文案）、`chatStore.ts`（1 行注释）、测试与 jiti 夹具的同步，均服务于本次声称意图：

- 上限可配后，"工具返回单次最多 10000 字"的写死文案会**失真**；
- registry 新增导出后，jiti 夹具（整模块替换）必须同步，否则调用即抛错。

## 结论

✅ **可交付**（0 个未修复 P0/P1；1 项 P0 护栏缺口已在审查中补齐）

---

## 阶段 7：challenger 二次质疑（代码变更模式）

**执行**：auto-review Step 6 判定为复杂场景（20+ 文件、新增模块、控制流与错误处理、跨模块契约）→ 自动接力。质疑报告全文见 `review/challenge-report.md` 的「**第二轮质疑（代码变更模式）**」。

**结果**：6 条质疑 → **成立 1**（🟡 中风险）、已知 2、不成立 2、可延后 1。

**成立质疑（已当场修复）**：#1 **失败步骤的响应被当作证据回放** —— `progress` 的失败步骤同样带 `response`（`tool-loop.ts:707/:739/:774` 三条错误路径），原收集条件未过滤 ⇒ 历史错误（如"未知工具"）会进入证据块、可能让模型误判工具不可用。修复：`replay.ts` 跳过 `error` 非空步骤 + 回归用例；复跑 `evidence-replay` **20/20**、后端全量 **315/315**。

**结论回写**：成立质疑为 🟡（非阻塞级）且已修复 ⇒ **维持 ✅ 可交付**；其余质疑点并入「合入后跟进」：

| 优先级 | 行动项 | 来源 |
|---|---|---|
| P1 | 重启 daemon 后做**真实回放复验**（TTFT / 重复检索下降幅度 / 长证据下的模型行为） | 质疑 #3 · 设计 S-02 §10 Q4/Q6 |
| P2 | `toolResponseChars` 配置生效的端到端断言扩为两阶段 | 质疑 #2（💤 可延后） |
| P2 | 若"来源列表条数 vs 模型可见条数"的差异被用户感知，再评估在 UI 标注 | 质疑 #4 |
