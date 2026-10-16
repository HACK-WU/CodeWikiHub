---
groupPath: 决策记录/文件理解与记忆专家
relation: 架构设计-上传入口在ai-context
exportedAt: "2026-10-16T08:16:32.869Z"
---
【决策记录｜架构设计-上传入口只在跨域的 ai/context（建句柄 ＋ 启动理解的唯一入口）】
- 分类：兼容处理（C5 §D1 原分类；本条按「架构设计」归口命名）
- 动机（避坑）：**现象** 仓库里并存四条上传路径（`/api/ai/contexts/file`、`/api/ai/v1/file`、`/api/storage-file`、`/api/files`），旧入口只落 `StorageFile`/destination；**后果** 新代码误用旧入口时，文件只有字节行、没有 `FileAsset` 句柄、也不会启动理解链，表现为「上传成功但 Agent 永远读不到」，而工具面与 `AgentFile` 契约都不会报错
- 决策：把「上传 ＋ 建句柄 ＋ 启动理解」定在跨域的 `ContextsController.create`（`@Controller('contexts')` 注册于挂 `/ai` 的 `AIModule` ⇒ 真实路径 **`POST /api/ai/contexts/file`**）；本域 `FileUnderstandingController` 只提供句柄/检索/删除类 **8 个端点、不含 multipart**；旧入口源码注释逐字：`@deprecated Use POST /contexts/file. The context endpoint returns an AgentFile/FileAsset handle and starts the file-understanding parse flow.`
- 背景约束：上传体里 `workspacePath` **被显式置空**（源码 `workspacePath = undefined`）；`target` 只允许服务端管理的 storage target（改 `directory`/`prefix` 或加键即 400 `Error.ExternalUploadTargetInvalid`，文案 `External uploads only support the server-managed storage target`）；`conversationId`/`threadId` 能解析到会话时**以会话字段覆盖** `projectId`/`xpertId`，会话/线程引用不一致直接 400；无会话时 `assertUploadScope({projectId,xpertId})`、有会话时 `assertCanCreateConversationAsset(conversation,'upload')`；`@Public()` 场景限制 `target.kind==='storage'` 且禁止 projectId
- 背景约束（解析时机）：是否同步解析由 `shouldRunParseInline(file, parseMode)` 决定（小文件内联、否则 `setImmediate` 后台）—— 这条判定与上传入口同处一地，迁移入口必须一并迁移
- 被否决方案：无（源码未记录否决记录）；旧入口的 `@deprecated` 注释即迁移口径 —— 旧入口「只落 storage/destination」vs 新入口「返回句柄并启动解析」
- 重评条件：若要把上传收敛回本域控制器，必须**同时**迁移 `AgentFile` 响应契约、upload-target 校验与 `assertUploadScope`/`assertCanCreateConversationAsset` 前置断言（三者缺一就会重现「上传成功但读不到」）
- 关联代码：file://packages/server-ai/src/ai/{context.controller.ts,ai-v1.controller.ts,ai.module.ts,external-upload-target.ts}、file://packages/server-ai/src/file-understanding/file-understanding.controller.ts
- 证据来源：C5-关键决策.md §D1；implementation/{05-接口.md 二上传入口与路径校正, 03-数据流转.md 链路一}；源码 `ai-v1.controller.ts` 的 `@deprecated` JSDoc 逐字
- 详细资产：.module-experts/后端专题/文件理解与记忆专家/ C5-关键决策.md §D1 · implementation/05-接口.md §二