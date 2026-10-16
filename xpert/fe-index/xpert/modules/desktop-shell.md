# DesktopShellModule（`desktop-shell`）

- **位置**：`packages/server-ai/src/desktop-shell/` · 归属文件 **9** 个 · 约 **1144** 行
- **定义**：`packages/server-ai/src/desktop-shell/desktop-shell.module.ts:15`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `devices`、`grants`、`operations` · 视图/接口入口 **9** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server-ai/src/desktop-shell/desktop-shell.controller.ts`（DesktopShellController） | `-` | 9 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：`RedisModule`、`TenantModule`
- **被依赖**（动它会影响）：`ServerAIModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`、`CqrsModule`

## 事件/命令耦合（不经 imports，1 出 / 0 入）

**我发出**（改这些命令/事件要连带看目标模块）：

- → `ChatConversationModule`（CQRS：`AssertChatConversationAccessQuery`）

## 数据表（4）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `desktop_shell_grant` | DesktopShellGrant | 5 | @Module imports forFeature | `packages/server-ai/src/desktop-shell/desktop-shell-operation.service.ts:57` |
| `desktop_shell_operation` | DesktopShellOperation | 5 | @Module imports forFeature | `packages/server-ai/src/desktop-shell/desktop-shell-operation.service.ts:52` |
| `desktop_shell_device` | DesktopShellDevice | 4 | @Module imports forFeature | `packages/server-ai/src/desktop-shell/desktop-shell-operation.service.ts:51` |
| `chat_conversation_thread` | ChatConversationThread | 3 | @Module imports forFeature | `packages/server-ai/src/desktop-shell/desktop-shell-auth.service.ts:35` |

## 归属文件（9）

- `packages/server-ai/src/desktop-shell/desktop-shell.errors.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell.gateway.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell.module.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell-operation.service.ts`
- `packages/server-ai/src/desktop-shell/shell-approval.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell-auth.service.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell.entities.ts`
- `packages/server-ai/src/desktop-shell/desktop-shell.controller.ts`
- `packages/server-ai/src/xpert-middleware/desktop-shell.middleware.ts`
