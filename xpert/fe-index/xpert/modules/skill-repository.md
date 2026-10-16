# SkillRepositoryModule（`skill-repository`）

- **位置**：`packages/server-ai/src/skill-repository/` · 归属文件 **24** 个 · 约 **2525** 行
- **定义**：`packages/server-ai/src/skill-repository/skill-repository.module.ts:16`（nestjs）
- **挂载前缀**：`/api/skill-repository` · 视图/接口入口 **8** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/skill-repository/skill-repository.controller.ts`（SkillRepositoryController） | `skill-repository` | 8 | `:23` |

## 依赖关系

- **依赖**（改它要连带看）：`SkillPackageModule`、`TenantModule`
- **被依赖**（动它会影响）：`InitializationModule`、`ServerAIModule`、`SkillPackageModule`、`SkillRepositoryIndexModule`、`XpertProjectModule`、`XpertTemplateModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`DiscoveryModule`、`BullModule`、`GITHUB_REQUEST_QUEUE`

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `skill_repository` | SkillRepository | 5 | @Module imports forFeature | `packages/server-ai/src/skill-repository/skill-repository.service.ts:28` |
| `skill_package` | SkillPackage | 3 | @Module imports forFeature | `packages/server-ai/src/skill-repository/plugins/workspace-public/strategy.ts:82` |

## 非 HTTP 入口

- **MQ 消费者**（1）：`(匿名队列)`

## 归属文件（24）

- `packages/server-ai/src/skill-repository/skill-repository.entity.ts`
- `packages/server-ai/src/skill-repository/skill-repository.controller.ts`
- `packages/server-ai/src/skill-repository/skill-repository.module.ts`
- `packages/server-ai/src/skill-repository/index.ts`
- `packages/server-ai/src/skill-repository/types.ts`
- `packages/server-ai/src/skill-repository/skill-repository.service.ts`
- `packages/server-ai/src/skill-repository/dto/simple-skill-repository.dto.ts`
- `packages/server-ai/src/skill-repository/dto/index.ts`
- `packages/server-ai/src/skill-repository/dto/simple-skill-index.ts`
- `packages/server-ai/src/skill-repository/plugins/index.ts`
- `packages/server-ai/src/skill-repository/plugins/clawhub/strategy.ts`
- `packages/server-ai/src/skill-repository/plugins/clawhub/index.ts`
- `packages/server-ai/src/skill-repository/plugins/clawhub/types.ts`
- `packages/server-ai/src/skill-repository/plugins/github/github.constants.ts`
- `packages/server-ai/src/skill-repository/plugins/github/strategy.ts`
- `packages/server-ai/src/skill-repository/plugins/github/index.ts`
- `packages/server-ai/src/skill-repository/plugins/github/types.ts`
- `packages/server-ai/src/skill-repository/plugins/github/github-request.job.ts`
- `packages/server-ai/src/skill-repository/plugins/workspace-public/strategy.ts`
- `packages/server-ai/src/skill-repository/plugins/workspace-public/index.ts`
- `packages/server-ai/src/skill-repository/plugins/zip/strategy.ts`
- `packages/server-ai/src/skill-repository/plugins/zip/archive.ts`
- `packages/server-ai/src/skill-repository/plugins/zip/index.ts`
- `packages/plugin-sdk/src/lib/agent/skill/skill-source-provider.registry.ts`
