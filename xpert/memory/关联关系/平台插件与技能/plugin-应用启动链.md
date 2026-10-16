---
groupPath: 关联关系/平台插件与技能
relation: plugin-应用启动链
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 插件运行时 与 应用启动链（apps/api 三个入口）
强度：必改——改 `PluginModule.init()` 的签名、加载顺序或 onPluginBootstrap 契约 → RootModule / WorkerRootModule / MigrationRootModule 三处必须同时改（启动失败即致命、readiness 不通过）；改 bootstrap 里插件段之外的代码 → 插件域不用管
原因：插件是唯一被应用启动链硬编码 import 的业务模块，且注册了全局 PluginScopeGuard（改插件路由等于改全局鉴权面）

插件端：
- PluginModule.init / onModuleInit（逐个跑 onPluginBootstrap，超时或失败即致命）@ packages/server/src/plugin/plugin.module.ts
- plugin-startup-step.ts / plugin-startup-state.ts（快照恢复：副本本地私有，绝不写回期望配置）@ packages/server/src/plugin/
- PluginScopeGuard（全局注册）@ packages/server/src/shared/guards/plugin-scope.guard.ts

启动链端：
- RootModule（imports [BootstrapModule, PluginModule.init()]）@ apps/api/src/bootstrap/index.ts
- WorkerRootModule @ apps/api/src/bootstrap-worker.ts
- MigrationRootModule @ apps/api/src/knowledge-filter-v2-migration-cli.ts