---
groupPath: 决策记录/平台插件与技能
relation: 架构设计-App安装用唯一scopeKey作并发锁
exportedAt: "2026-10-16T03:52:14.870Z"
---
【决策记录｜App 安装用唯一 scopeKey 作数据库并发锁】
- 分类：架构设计
- 动机：避坑：用户在多浏览器/多会话重复点「初始化」或进程崩溃后重试 → 重复创建 Workspace/Assistant/知识库，产生无法自动归并的孤儿资源
- 决策：plugin_application_installation 上 (tenantId, pluginName, appName, scopeKey) 唯一；scopeKey 取 organizationId。插入成功者即「认领者」，唯一索引冲突被捕获后回读现状并返回、不再创建资源；configuring/failed/degraded 行可被修复式接管，**initializing 行 5 分钟后允许被第二个请求接管**
- 背景约束：认领的容错依赖数据库唯一索引而非分布式锁；并发正确性完全建立在 PostgreSQL 唯一约束上；5 分钟接管窗口是启发式，长耗时初始化可能被误判
- 被否决方案：无
- 重新评估触发条件：出现长耗时初始化被 5 分钟窗口误接管；或需要多组织并发安装同一 App 时的细粒度资源键
- 关联代码：plugin-application-installation.entity.ts、plugin-application.service.ts（claimInstallation）、plugin-application-setup.service.ts @ packages/server-ai/src/plugin-resource/
- 证据来源：实体类 JSDoc「The unique scope key is the database concurrency lock…」+ claimInstallation JSDoc（明写）