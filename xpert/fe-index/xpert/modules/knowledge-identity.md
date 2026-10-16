# KnowledgeIdentityModule（`knowledge-identity`）

- **位置**：`packages/server-ai/src/knowledgebase/identity/` · 归属文件 **10** 个 · 约 **943** 行
- **定义**：`packages/server-ai/src/knowledgebase/identity/knowledge-identity.module.ts:9`（nestjs）
- **挂载前缀**：- · 视图/接口入口 **0** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 依赖关系

- **依赖**（改它要连带看）：`KnowledgebaseModule`
- **被依赖**（动它会影响）：`GraphragModule`、`KnowledgeWikiModule`
- **依赖的库/框架模块**：`TypeOrmModule`

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `knowledge_identity` | KnowledgeIdentity | 4 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/identity/knowledge-identity.service.ts:163` |
| `knowledge_identity_observation` | KnowledgeIdentityObservation | 4 | @Module imports forFeature | `packages/server-ai/src/knowledgebase/identity/knowledge-identity.service.ts:164` |
| `knowledge_document` | KnowledgeDocument | 1 | getRepository | `packages/server-ai/src/knowledgebase/identity/knowledge-identity.service.ts:40` |
| `knowledgebase` | Knowledgebase | 1 | getRepository | `packages/server-ai/src/knowledgebase/identity/knowledge-identity.service.ts:276` |

## 归属文件（10）

- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-observation.entity.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-model.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity.service.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity.module.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity.types.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity.entity.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-embedding.service.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-catalogue.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-error.ts`
- `packages/server-ai/src/knowledgebase/identity/knowledge-identity-policy.ts`
