---
groupPath: 决策记录/平台底座与集成专家
relation: 可靠性-物理表激活与DDL风险
exportedAt: "2026-10-16T08:16:32.872Z"
---
【决策记录｜物理表激活走 UPGRADE DDL，DDL 与 Meta 不同事务（可靠性风险面）】
- 分类：架构设计
- 动机（避坑）：**现象** 逻辑 Meta 行与外部库物理表必须同时存在才有用，而 `upsertTable` 的 validate →（可选 rename）→ activate 三步**串行且不同事务**，`deleteTable` 也是先 `DROP_TABLE` 再 `softDelete`；**后果** 激活失败必须区分「新表」与「既有表」两套清理语义，drop 失败会在外部库留下**物理表孤儿**，非 active 改名会让 `physicalTableName` 与 Meta 名脱节
- 决策：把「逻辑真相」与「物理真相」拆开——`xpert_table` 只存 Meta（`columns json` / 7 态 `status` / `physicalSchema` / `physicalTableName` / `version` / `activatedAt`），物理结构与数据留在外部库；激活统一走 `DBTableAction.CREATE_TABLE` + `DBCreateTableMode.UPGRADE`（**幂等升级而非重建**），成功后 `active + activatedAt` 并清 `message`，失败 `error + message`；行与 SQL 入口**刻意不暴露 HTTP**，只经 `@WorkflowNodeStrategy(DB_SQL)`/`(DB_INSERT)` 交给助手工作流，使工作区授权成为唯一执行边界
- 背景约束：激活失败时**新表硬删逻辑行、既有表只标 ERROR**（一致性优先于保留现场）；`deleteTable` 的 `DROP_TABLE` 失败仅 `logger.error` 后照常软删；`version` 只是普通 int 列（**不是 `@VersionColumn`**），激活与升降级全靠 `status + version` 手工管理；`validateTableName` 在异常分支对「更新」放行（`return !entity.id`）；7 态中 `ready/needsMigration/deprecated` **未找到写入点**
- 状态迁移（实证）：`draft → pendingActivation → active`（`activateTable`）；失败 `→ error + message`；`upsertTable` 更新既有行也**无条件**走激活；`RENAME_TABLE` 仅在 `old.status === ACTIVE` 且 name 变化时执行
- 失败面（运维）：孤儿物理表需人工 `DROP`；`ERROR` 行需修 Meta 后重试 `POST /api/xpert-table/:id/activate`；每次代理与 DDL 都新建 runner 并 `finally teardown()`（**无连接池、无 schema 缓存**，代价由外部库决定）
- 被否决方案：无（未见对「DDL 与元数据同事务」或「只做逻辑视图不落物理表」的显式否决记录）
- 重新评估触发条件：外部库不支持 `UPGRADE` 语义、或需要「一次提交保证 DDL 与 Meta 同时成功」时——须引入补偿/对账作业，并把 delete 改为两阶段（先标记后 drop）
- 相邻链路：物理表建在 `data-source` 管理的外部库上（`xpert-table.module` imports `DataSourceModule`，`XpertDatabaseAdapterQuery` 是唯一向 `DataSourceStrategyQuery` 传 `dataSourceId` 的调用方）——凭据注入与引擎白名单口径随 data-source 一起变
- 关联代码：`file://packages/server-ai/src/xpert-table/{xpert-table.service.ts,xpert-table.entity.ts,plugins/sql/strategy.ts,queries/handlers/xpert-database-adapter.handler.ts}`
- 证据来源：C5-关键决策.md §D3；implementation/01-架构.md「关键不变量」4 与「结论」②；implementation/02-实现.md「xpert-table 实现」与「技术债与 hack」8；implementation/05-接口.md 第五节；implementation/04-模型.md ②
- 详细资产：/root/xpert/.module-experts/后端专题/平台底座与集成专家/ C5-关键决策.md §D3 · sub-experts/数据源与表格子专家/C1-能力契约.md §3 · implementation/03-数据流转.md 链路四