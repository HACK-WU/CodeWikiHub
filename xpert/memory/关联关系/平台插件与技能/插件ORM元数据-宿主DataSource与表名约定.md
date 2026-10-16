---
groupPath: 关联关系/平台插件与技能
relation: 插件ORM元数据-宿主DataSource与表名约定
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] 插件 ORM 元数据合并 与 宿主 DataSource / 插件实体定义
强度：必改——改表名前缀约定（`plugin_<namespace>_`）、合并时机（必须在 lazyLoader.load() 之前）或 schema preflight 流程 → 所有插件的实体定义与已装插件必改（否则 EntityMetadataNotFoundError 或建表失败）；改插件自身业务逻辑 → 宿主不用管
原因：宿主无 migrations 目录，插件实体靠运行期合并进活 DataSource + 加锁 preflight 建表，顺序与命名是框架级不可变契约

宿主端：
- registerPluginOrmMetadataInDataSource / validatePluginEntityTableNames @ packages/server/src/plugin/plugin-orm-metadata.ts
- PluginSchemaSyncService（Redis 锁 xpert:plugin:schema-sync）@ packages/server/src/plugin/
- PluginManagementService（注册链顺序：合并 metadata → lazyLoad → 注册路由/策略）@ packages/server/src/plugin/plugin-management.service.ts

插件端：
- 各插件的 @Entity 声明（表名前缀必须匹配 plugin_<namespace>_）@ packages/plugins/* 与外部插件包
- @xpert-ai/plugin-sdk（实体与权限 token 契约、SDK 版本断言）@ packages/plugin-sdk/