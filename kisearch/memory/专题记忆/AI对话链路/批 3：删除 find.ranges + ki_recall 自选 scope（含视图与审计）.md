---
groupPath: 专题记忆/AI对话链路
relation: 批 3：删除 find.ranges + ki_recall 自选 scope（含视图与审计）
exportedAt: "2026-11-25T05:20:32.038Z"
---
2026-11-25 批 3（用户拍板「检索范围配置没用了可删」「ki_recall 也该支持视图」）。

**删除 find.ranges**：`FindRangeConfig` / `FindConfig.ranges` / `defaultFindConfig().ranges` / 归一化段的 ranges 校验 / `chat-routes` 的保存期预检 / `FIND_MAX_TARGETS` / `limits.findMaxTargets` / 前端「检索范围」块与 `findScopeOptions` / 契约 / clone 已全删。老配置里带 `ranges` 读取时**静默忽略**（不报 issue，否则整份回退默认）。`resolveFindTargets(eventScope, deps)` 现在恒返回 `[eventScope]`（事件库鉴权仍由上层 403 负责）。

**ki_recall 自选 scope（Q3/Q4）**：
- 入参 `scope` 只是**默认值**；模型可在每次调用传 `scope`（库名或视图，支持逗号多值）；
- 逐次校验复用 `resolveRecallTargets`（存在 + 授权 + 视图展开），失败返回**可行动错误 + 可用清单**，**不回落默认**；
- `ki_scope_list` 改回「授权范围内可用库 + 视图（含成员）」——模型自选的唯一目录；
- 审计：`GroundedToolOutcome.scopeUsed` → toolTrace 每步记 `scope`，结果新增 `scopesUsed`（并集），`recallLog` 新增 `scopes`；
- 提示词新增 `buildScopeNote`（默认范围 / 可换库 / 可用库与视图 / 换错会报错），与运行期校验同源。

**隔离设计**：`makeRecallToolRunner` 的 `resolveScope` 由调用方注入；「AI 查找」侧不注入 = 范围仍锁定，行为不变（写工具永不加 scope，Q5）。测试注入点 `impl`（search/getModuleInfo/queryGroup/tagList）便于不碰真实库地验证 scope 传递。

**真机**：视图 `kisearch-docs` → `targets=["kisearch-docs"]`、`scopesUsed=["kisearch-memory","kisearch-xperts"]`（展开正确）、rounds=9/candidates=4/partial=false。契约：`find` 无 ranges、limits 无 findMaxTargets、工具 5 个。

**未做**：分析主链路（analysis-runner 的 5 个 kb-read）仍未加 scope 参数（批 3-C），需 authScopes 注入 + 队列按实际 scope 入队。