# ArtifactsModule（`artifacts`）

- **位置**：`packages/server-ai/src/artifacts/` · 归属文件 **10** 个 · 约 **2727** 行
- **定义**：`packages/server-ai/src/artifacts/artifacts.module.ts:15`（nestjs）
- **挂载前缀**：`/api/artifacts/share` · 视图/接口入口 **24** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/artifacts/artifacts.controller.ts`（ArtifactsPublicController） | `artifacts/share` | 24 | `:34` |

## 依赖关系

- **依赖**（改它要连带看）：`RuntimeCapabilityModule`、`UserModule`、`UserOrganizationModule`、`VolumeModule`、`XpertWorkspaceModule`
- **被依赖**（动它会影响）：`AgentInvocationModule`、`AgentMiddlewareRuntimeModule`、`ChatConversationModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `artifact_version` | ArtifactVersion | 6 | @Module imports forFeature | `packages/server-ai/src/artifacts/artifacts.service.ts:122` |
| `artifact` | Artifact | 5 | @Module imports forFeature | `packages/server-ai/src/artifacts/artifacts.service.ts:120` |
| `artifact_link` | ArtifactLink | 5 | @Module imports forFeature | `packages/server-ai/src/artifacts/artifacts.service.ts:124` |
| `artifact_access_log` | ArtifactAccessLog | 3 | @Module imports forFeature | `packages/server-ai/src/artifacts/artifacts.service.ts:126` |

## 归属文件（10）

- `packages/server-ai/src/artifacts/artifact-mime-policy.ts`
- `packages/server-ai/src/artifacts/artifacts.controller.ts`
- `packages/server-ai/src/artifacts/index.ts`
- `packages/server-ai/src/artifacts/artifacts.service.ts`
- `packages/server-ai/src/artifacts/artifacts.module.ts`
- `packages/server-ai/src/artifacts/entities/artifact.entity.ts`
- `packages/server-ai/src/artifacts/entities/index.ts`
- `packages/server-ai/src/artifacts/entities/artifact-access-log.entity.ts`
- `packages/server-ai/src/artifacts/entities/artifact-version.entity.ts`
- `packages/server-ai/src/artifacts/entities/artifact-link.entity.ts`
