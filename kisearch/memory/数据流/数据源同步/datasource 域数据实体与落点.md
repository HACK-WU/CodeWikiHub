---
groupPath: 数据流/数据源同步
relation: datasource 域数据实体与落点
exportedAt: "2026-11-25T08:07:10.407Z"
---
数据源同步域的数据实体流向（基线 0f1426b）。
- datasource.json：生产方 addDataSource / saveDataSourceSchedule，落 <kbDir>/<scope>/，消费方为调度器与数据源列表页，用途是登记源与定时计划。
- ~/.ki/datasources 托管克隆：生产方 refreshManagedClone / managedScopeDir，消费方为同步执行器，用途是存远端仓库本地副本；KI_DATASOURCE_CLONE_ROOT 可覆盖。
- 待删候选：生产方 syncDataSource，去向为 SyncDataSourceResult，消费方为 Web 数据源页与裁剪确认，用途是只算候选不删除。
- 任务台账：经 createTaskReporter / task-log 落 .ki-tasks/logs，供后台任务页读。
- 详细流向：见 .module-experts/数据源同步专家/C4-数据流向与消费.md。