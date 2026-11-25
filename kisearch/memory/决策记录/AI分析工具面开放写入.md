---
groupPath: 决策记录
relation: AI分析工具面开放写入
exportedAt: "2026-11-23T08:46:21.599Z"
---
AI 分析域在只读 8 件套之外新增「写入」组（4 个，危险组默认关），2026-11-23 实施（REQ-20261123-004）。
- 分组: `ANALYSIS_TOOL_GROUPS` 增 `kb-write`（`ki_store` / `ki_sync_relation` / `ki_bulk_sync_relation` / `ki_group_create`），`danger: true`
- **默认值陷阱（已修）**: 旧 `defaultAnalysisTools()` 把白名单全置 true，前端与两个 runner 又按「缺键=开」判定；新增写工具若沿用，存量配置升级即静默获得写权限 → 改为 `analysisToolDefaultOn(name)` 按组 `danger` 定默认，前端与 runner 统一走 `isAnalysisToolEnabled`。对话面板是「缺键=关」（`=== true`），两处语义相反，不可统一
- 复用: 写工具直接取 `CHAT_MCP_TOOLS` 的 def/parse/run（`getChatTool`），排队车道 / 超时 / config 快照 / `SCOPE_READONLY` 门禁全部继承，勿另写 execute* 调用
- 刻意不纳入: `ki_delete_relation` / `ki_group_delete_empty`（分析无删除闭环且不可恢复）、`ki_bulk_store`（入参是任意本地 JSON 路径、无白名单）、`ki_edit_relation`（finish 异步需轮询、局部改行易坏长文档）
- 追问共用同一份 `analysis.tools`（与 REQ-20261123-002 REQ-06 一致），无法只给分析
- **落点约束不做**（2026-11-23 用户拍板）：不需要 group 级约束，scope 由程序注入、入参无 scope，写入恒定落在事件所在库即硬边界；先前实现的 `analysis.writeGroups` 与 `WRITE_LOCATION_DENIED` 已全部回退，配置文件残留已清理。注意 `analysis` 域是**整域替换**语义（域内缺键回落默认），手工 PUT 部分字段会清掉 tools
- 只读库不做面板置灰（设置页是全局配置、无 scope 上下文），改为运行时在【运行环境】段注入提示
- 位置: `src/lib/chat/prompt-config.ts`、`src/lib/events/analysis-runner.ts::buildKbWriteToolEntries`、`analysis-ask-runner.ts`、`web/src/chat/PromptConfigLayer.tsx`、`code-locate-skill.ts`（写入纪律 9 条）