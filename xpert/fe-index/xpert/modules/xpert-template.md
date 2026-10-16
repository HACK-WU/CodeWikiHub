# XpertTemplateModule（`xpert-template`）

- **位置**：`packages/server-ai/src/xpert-template/` · 归属文件 **56** 个 · 约 **9681** 行
- **定义**：`packages/server-ai/src/xpert-template/xpert-template.module.ts:22`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `catalog`、`catalog-avatar`、`mcps` 等 5 个 · 视图/接口入口 **13** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/xpert-template/xpert-template.controller.ts`（XpertTemplateController） | `-` | 13 | `:33` |

## 依赖关系

- **依赖**（改它要连带看）：`SkillPackageModule`、`SkillRepositoryIndexModule`、`SkillRepositoryModule`、`TenantModule`、`UserModule`
- **被依赖**（动它会影响）：`AssistantBindingModule`、`InitializationModule`、`PluginResourceModule`、`ServerAIModule`、`SkillPackageModule`、`XpertMarketplaceModule`、`XpertModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`、`DiscoveryModule`

## 事件/命令耦合（不经 imports，2 出 / 1 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `AgentPluginModule`（CQRS：`AgentPluginTemplatesCommand`）
- → `PluginResourceModule`（CQRS：`InspectTemplateReadinessCommand`、`PluginTemplateInstallCommand`）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `InitializationModule`（`ResolveTemplateSkillRefsCommand`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `xpert_template` | XpertTemplate | 4 | @Module imports forFeature | `packages/server-ai/src/xpert-template/xpert-template.service.ts:105` |
| `skill_repository` | SkillRepository | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-template/template-skill-sync.service.ts:76` |
| `xpert_workspace` | XpertWorkspace | 3 | @Module imports forFeature | `packages/server-ai/src/xpert-template/template-skill-sync.service.ts:78` |
| `assistant_template_publication` | TemplatePublicationEntity | 1 | getRepository | `packages/server-ai/src/xpert-template/lifecycle/template-publication.store.ts:15` |

## 非 HTTP 入口

- **CQRS Handler**（2）：`ResolveTemplateSkillRefsCommand`、`EnsureTemplateDirectoryCommand`

## 归属文件（56）

- `packages/server-ai/src/xpert-template/template-catalog-upgrade.ts`
- `packages/server-ai/src/xpert-template/xpert-template.service.ts`
- `packages/server-ai/src/xpert-template/xpert-template.module.ts`
- `packages/server-ai/src/xpert-template/xpert-template.controller.ts`
- `packages/server-ai/src/xpert-template/template-skill-sync.service.ts`
- `packages/server-ai/src/xpert-template/xpert-template.entity.ts`
- `packages/server-ai/src/xpert-template/template-catalog.ts`
- `packages/server-ai/src/xpert-template/xpert-template-dsl-metadata.ts`
- `packages/server-ai/src/xpert-template/template.types.ts`
- `packages/server-ai/src/xpert-template/template.constants.ts`
- `packages/server-ai/src/xpert-template/plugin-template-descriptor.ts`
- `packages/server-ai/src/xpert-template/capabilities/bosi-template.ts`
- `packages/server-ai/src/xpert-template/capabilities/capability-state.ts`
- `packages/server-ai/src/xpert-template/capabilities/realtime-voice.schema.ts`
- `packages/server-ai/src/xpert-template/capabilities/template-draft.ts`
- `packages/server-ai/src/xpert-template/capabilities/template-capability-reference.ts`
- `packages/server-ai/src/xpert-template/capabilities/realtime-voice.capability.ts`
- `packages/server-ai/src/xpert-template/capabilities/builtin-capabilities.ts`
- `packages/server-ai/src/xpert-template/capabilities/template-model-option.ts`
- `packages/server-ai/src/xpert-template/capabilities/assistant-capability.service.ts`
- `packages/server-ai/src/xpert-template/capabilities/blank-assistant-template.ts`
- `packages/server-ai/src/xpert-template/commands/resolve-template-skill-refs.command.ts`
- `packages/server-ai/src/xpert-template/commands/ensure-template-directory.command.ts`
- `packages/server-ai/src/xpert-template/commands/index.ts`
- `packages/server-ai/src/xpert-template/commands/handlers/resolve-template-skill-refs.handler.ts`
- `packages/server-ai/src/xpert-template/commands/handlers/index.ts`
- `packages/server-ai/src/xpert-template/commands/handlers/ensure-template-directory.handler.ts`
- `packages/server-ai/src/xpert-template/definition/assistant-template-overview.ts`
- `packages/server-ai/src/xpert-template/definition/assistant-capability-structure.ts`
- `packages/server-ai/src/xpert-template/definition/normalize-assistant-template.ts`
- `packages/server-ai/src/xpert-template/definition/assistant-template.schema.ts`
- `packages/server-ai/src/xpert-template/lifecycle/template-baseline.ts`
- `packages/server-ai/src/xpert-template/lifecycle/template-publication.entity.ts`
- `packages/server-ai/src/xpert-template/lifecycle/template-publication.store.ts`
- `packages/server-ai/src/xpert-template/lifecycle/portable-template.ts`
- `packages/server-ai/src/xpert-template/skill-packages/slides/assets/pptxgenjs_helpers/text.js`
- `packages/server-ai/src/xpert-template/skill-packages/slides/assets/pptxgenjs_helpers/svg.js`
- `packages/server-ai/src/xpert-template/skill-packages/slides/assets/pptxgenjs_helpers/util.js`
- `packages/server-ai/src/xpert-template/skill-packages/slides/assets/pptxgenjs_helpers/code.js`
- `packages/server-ai/src/xpert-template/skill-packages/slides/assets/pptxgenjs_helpers/index.js`
- ……其余 16 个见 JSON 输出（完整清单）
