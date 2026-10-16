# LanguageModule（`language`）

- **位置**：`packages/server/src/language/` · 归属文件 **11** 个 · 约 **924** 行
- **定义**：`packages/server/src/language/language.module.ts:10`（nestjs）
- **挂载前缀**：`/api` + 方法路径 `getByName` · 视图/接口入口 **2** 个
- **置信度**：🟢（模块边界来自 @Module 声明）

## 控制器（模块对外面）

| 文件 | 前缀 | 接口数 | 位置 |
|------|------|--------|------|
| `packages/server/src/language/language.controller.ts`（LanguageController） | `-` | 2 | `:9` |

## 依赖关系

- **依赖**（改它要连带看）：`UserModule`
- **被依赖**（动它会影响）：`ServerAppModule`
- **依赖的库/框架模块**：`TypeOrmModule`、`RouterModule`

## 事件/命令耦合（不经 imports，0 出 / 1 入）

**我接收**（这些模块发来的命令/消息由我处理，改它们要连带看我）：

- ← `TenantModule`（`LanguageInitCommand`）

## 数据表（1）

| 表 | 实体 | 引用次数 | 来源 | 证据 |
|----|------|----------|------|------|
| `language` | Language | 4 | @Module imports forFeature | `packages/server/src/language/language.service.ts:12` |

## 非 HTTP 入口

- **CQRS Handler**（1）：`LanguageInitCommand`

## 归属文件（11）

- `packages/server/src/language/all-languages.ts`
- `packages/server/src/language/index.ts`
- `packages/server/src/language/language.service.ts`
- `packages/server/src/language/language.entity.ts`
- `packages/server/src/language/language.controller.ts`
- `packages/server/src/language/language.module.ts`
- `packages/server/src/language/language.seed.ts`
- `packages/server/src/language/commands/language-init.command.ts`
- `packages/server/src/language/commands/index.ts`
- `packages/server/src/language/commands/handlers/index.ts`
- `packages/server/src/language/commands/handlers/language-init.handler.ts`
