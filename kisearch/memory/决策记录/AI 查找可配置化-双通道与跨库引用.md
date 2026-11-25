---
groupPath: 决策记录
relation: AI 查找可配置化-双通道与跨库引用
exportedAt: "2026-11-16T08:19:42.347Z"
---
「AI 查找」从确定性五步扩为双通道可配置能力（REQ-20261116-005，设计定稿 v6、评审+质疑全过，未实施）：快速通道保留确定性五步（可复现、<1s、零成本），深度通道新增 LLM 工具循环（提示词 / Skill / 只读四件套可配）。一期（S-01/S-02 范围 + 跨库）不依赖 LLM，可独立交付。

- 配置：PromptConfig 新增独立 `find` 域（`ranges.extraScopes` + 预留 `byScope` + prompt + skills + tools + maxRounds/maxCandidates/timeoutMs）；老 `findPrompt` 仅读取兼容、写入进 `find`；缺失即补齐且不报 issue（报 issue 会整份回退默认）。新增内置 skill 会让老配置自动多一条，走既有补齐口径。
- 范围：targets = [事件库] ∪ extraScopes，由后端 `resolveFindTargets` 解析、**前端不可传**；权限三层 + 引用可检索性；复用 `scope-access.ts:49` 的 mtime 快照，**禁止自建 TTL 缓存**（会出现授权用旧成员、展开用新成员的越权窗口）。
- 跨库：`RefCandidate` 增 `origin/scope/rankInScope/rawScore/visibilityReason`，`EventRefDoc` 增 `sourceScope`（缺省 = 事件库，不回写迁移）；去重与删除 key 必含 sourceScope（现为 `group\0name`，跨库同名会静默跳过或删错）；`stale` 拆 `staleReason(doc-deleted|scope-missing)`。
- 可见性分界：源文档被事件锁在不可检索阶段 → 源事件**已收口**则 409 `REF_DOC_NOT_SEARCHABLE` 拒绝，**未收口**则放行 + 候选行强提示（收口不可逆、未收口可逆）。
- 深度通道：`find-runner` 注入固定 targets 作工具作用域（`ki_search` 的 scope 强制覆盖，模型不可扩大），末轮 ` ```json ` + 三重校验（范围/存在性/未已用），同步 + abort + 45s 硬超时；**每个工具调用独立 submit**，禁止整段包一个 submit（coordinator 同 scope 串行，会变成库级阻塞）。
- 分数：跨库用全批次 min-max + `rankInScope`；deep 的 score 来自工具命中，`0` 不判 weak，默认勾选按模型输出顺序（`origin=deep`）。
- 一期横幅：`capabilities.findDeep=false` 时四块未生效配置挂「深度查找上线后生效」，与旧「未接入」不混用。
- 实施前置：45s 同步请求可能被网关掐断（须 demo-verify）；前端 `governanceApi.req()` 是裸 fetch，需补 AbortSignal 与超时（= 服务端 timeoutMs + 10s）。
- 文档：`CodeWikiHub/kisearch/requirements/2026-11-16-ai-find-configurable/`（design/DESIGN.md + S01~S04、design/design-review.md、review/challenge-report.md）。