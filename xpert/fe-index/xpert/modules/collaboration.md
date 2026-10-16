# CollaborationModule（`collaboration`）

- **位置**：`packages/server-ai/src/collaboration/` · 归属文件 **10** 个 · 约 **1375** 行
- **定义**：`packages/server-ai/src/collaboration/collaboration.module.ts:13`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`RuntimeCapabilityModule`
- **被依赖**（动它会影响）：`AgentMiddlewareRuntimeModule`、`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`DiscoveryModule`

## 数据表（2）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `collaboration_document` | CollaborationDocument | 4 | @Module imports forFeature | `packages/server-ai/src/collaboration/collaboration.service.ts:102` |
| `collaboration_update` | CollaborationUpdate | 4 | @Module imports forFeature | `packages/server-ai/src/collaboration/collaboration.service.ts:103` |

## 归属文件（10）

- `packages/server-ai/src/collaboration/collaboration.service.ts`
- `packages/server-ai/src/collaboration/collaboration-materialization.processor.ts`
- `packages/server-ai/src/collaboration/collaboration-input.ts`
- `packages/server-ai/src/collaboration/index.ts`
- `packages/server-ai/src/collaboration/collaboration.gateway.ts`
- `packages/server-ai/src/collaboration/collaboration.module.ts`
- `packages/server-ai/src/collaboration/entities/index.ts`
- `packages/server-ai/src/collaboration/entities/collaboration-update.entity.ts`
- `packages/server-ai/src/collaboration/entities/collaboration-document.entity.ts`
- `packages/plugin-sdk/src/lib/collaboration/provider.registry.ts`
