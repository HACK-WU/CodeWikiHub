# SkillRepositoryIndexModule（`skill-repository-index`）

- **位置**：`packages/server-ai/src/skill-repository/repository-index/` · 归属文件 **4** 个 · 约 **483** 行
- **定义**：`packages/server-ai/src/skill-repository/repository-index/skill-repository-index.module.ts:10`（nestjs）
- **挂载前缀**：`/api/skill-repository-indexes` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.controller.ts`（SkillRepositoryIndexController） | `skill-repository-indexes` | 2 | `:44` |

## 依赖关系

- **依赖**（改它要连带看）：`SkillRepositoryModule`、`TenantModule`
- **被依赖**（动它会影响）：`InitializationModule`、`ServerAIModule`、`SkillPackageModule`、`XpertProjectModule`、`XpertTemplateModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`CqrsModule`

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `skill_repository_index` | SkillRepositoryIndex | 3 | @Module imports forFeature | `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.service.ts:83` |

## 归属文件（4）

- `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.service.ts`
- `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.controller.ts`
- `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.module.ts`
- `packages/server-ai/src/skill-repository/repository-index/skill-repository-index.entity.ts`
