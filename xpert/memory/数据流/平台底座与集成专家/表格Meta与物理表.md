---
groupPath: 数据流/平台底座与集成专家
relation: 表格Meta与物理表
exportedAt: "2026-10-16T08:16:32.871Z"
---
【数据流｜表格Meta与物理表】
- 实体类型：表（`XpertTable` 单表）+ **外部库物理表**（结构不在平台库）；模块 `packages/server-ai/src/xpert-table`
- 结构 `xpert_table`：`name(100)`、`database`（弱引用，**无外键**）、`schema`、`columns`（json，`TXpertTableColumn[]`）、`status`（varchar(30) default `draft`，7 态）、`message`、`physicalSchema(100)`（如 `xpert_data`）、`physicalTableName(150)`（如 `xd_ta3f1a_…_v1`）、`version`（int default 1，**普通列、非 `@VersionColumn`**）、`activatedAt`、软删 `deletedAt`；继承 `workspaceId`；**无唯一索引**
- 状态枚举：`draft/ready/pendingActivation/active/needsMigration/deprecated/error`；其中 `ready/needsMigration/deprecated` 三态**未找到写入点** `[推测]`
- 是否加密/脱敏：**无加密列**；`name`/`columns`/`physicalTableName` 无敏感内容；本表是本批**唯一可软删**的表
- 生产方（Meta）：`XpertTableController` POST/PUT → `XpertTableService.upsertTable`（**保存即激活**）、`POST /:id/activate`（仅供重试）、`DELETE /:id`（ACTIVE 先 `DROP_TABLE`）；`validateTableName` 先打一次外部库 `GET_TABLE_INFO` 并按逻辑行 id 比对
- 生产方（物理表）：`XpertDatabaseAdapterQuery(database)` 取适配器 → `adapter.tableOp(CREATE_TABLE, {createMode: UPGRADE})`（**幂等升级而非重建**）、`RENAME_TABLE`（仅 `old.status === ACTIVE` 且 name 变化）、`insertRow`/`executeSql`、`deleteTable` 的 `DROP_TABLE`
- 消费方：工作流节点 `DB_SQL`（mustache 渲染 `sqlTemplate` 后 `executeSql`）/`DB_INSERT`（从 state 取值后 `insertRow`）、助手侧策略与 validator、`getDatabaseSchemas`（`adapter.getCatalogs`）、`XpertDatabasesQuery`（可激活目标库）
- 用途：Meta 层承载「逻辑定义」，物理结构与数据留在**外部库**；行与 SQL 入口**刻意不暴露 HTTP**，使工作区授权（`assertWorkspaceReadAccess/WriteAccess`）成为唯一执行边界；`insertRow`/`executeSql` 硬前置 `status === ACTIVE`
- 状态迁移（实证）：`draft → pendingActivation → active`（`activateTable`）；失败 `→ error + message`；`upsertTable` 更新既有行也**无条件**走激活
- 边界/一致性：DDL 与元数据**不同事务**——激活失败**新表硬删逻辑行、既有表只标 `ERROR + message`**；`DROP_TABLE` 失败仅 `logger.error` 后照常软删（**物理表孤儿**）；非 active 改名会让 `physicalTableName` 与 Meta 名脱节
- 相邻关系：`xpert-table.module` **imports `DataSourceModule`**（复用 `DataSourceService` 与 `DBQueryRunner`，**无连接池、无 schema 缓存**）；`XpertDatabaseSchemaQuery`（`get-database-schemas.query.ts`）**未注册 handler**（死 Query 类）；`xpert-workspace` 以 `forwardRef` 与本模块双向装配
- 详细流向：见 /root/xpert/.module-experts/后端专题/平台底座与集成专家/implementation/{03-数据流转.md 链路四,04-模型.md ②}