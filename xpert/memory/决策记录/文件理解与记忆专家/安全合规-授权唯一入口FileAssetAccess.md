---
groupPath: 决策记录/文件理解与记忆专家
relation: 安全合规-授权唯一入口FileAssetAccess
exportedAt: "2026-10-16T08:16:32.869Z"
---
【决策记录｜安全合规-授权唯一入口 FileAssetAccessService.resolve】
- 分类：安全合规
- 动机（避坑）：**现象** 本域端点同时被用户会话、API Key、ENTERPRISE_XPERT client secret、平台 runtime、Agent 工具与命令投递方调用，身份形态不统一；**后果** 判定若写在控制器装饰器里：(a) 非 HTTP 调用面（runtime capability / 工具 / 命令投递方）完全不被保护；(b) 要为每种身份各写一份守卫；(c) 控制器签名会暴露「资源是否存在」可被枚举；反之若只在控制器布防，**绕过 service 直查仓储即越权**
- 决策：文件侧唯一授权入口是 `FileAssetAccessService.resolve({ locator, authority, operation })`（`operation ∈ read|attach|parse|write|delete`），在 service 内做 `tenantId` 过滤 ＋ 组织可见性（`organizationId` 为空 = 租户级可见）＋ locator 一致性 ＋ 会话/项目/助手边界断言；**「不存在」与「无权限」统一抛 `FileAssetAccessDenied`（403，防枚举，默认文案 `You do not have access to this file`）**
- 决策（另两侧的实现位置）：存储侧鉴权在 `StorageFileService`（owner 或 `SUPER_ADMIN/ADMIN`；跨域删除走 `deleteAuthorizedStorageFile` 比对 `tenantId`/`organizationId`）；记忆侧用 `XpertGuard`（owner 或 workspace 可访问，命中后缓存 5 分钟）
- 背景约束：`FileUnderstandingController` 类级 `@Public()` ＋ `@AllowClientSecretBindings(ENTERPRISE_XPERT)` ＋ `ApiKeyOrClientSecretAuthGuard` ⇒ **文件级边界完全隐式落在 `resolve` 里**（从控制器签名看不到任何鉴权痕迹）；`StorageFileController` **既无守卫也无装饰器**，且 `deleteStorageFile` 把任何异常（含找不到行）catch 成 403 ⇒ 403 与 404 语义不可分
- 背景约束（跨域硬约束）：**`attach` 到项目先 `assertCanEdit` 再查 link**（源码注释逐字：Authorize it before consulting the link so a read-only member cannot use an existing grant to bypass the Project edit boundary.）；`ConversationFileLink` 即读边界（注释逐字「The link is the read-permission boundary for file tools」）；个人 Xpert 卷不因项目会话自动公开（「A personal Xpert volume is not made public merely because a Project conversation runs the same Xpert.」）
- 被否决方案：无（未被表述为一次方案否决；但源码注释**明确否定了「先看 link 再授权」的次序**）
- 重评条件：新增任何非 HTTP 调用面时必须经 service 断言或 `FileRuntimeService`，**不得直查仓储**；三套风格（`resolve` / service / `XpertGuard`）并存意味着改一处需同步核对另外两处
- 关联代码：file://packages/server-ai/src/file-understanding/file-asset-access.service.ts、file://packages/server/src/storage-file/storage-file.service.ts、file://packages/server-ai/src/xpert/guards/xpert.guard.ts、file://packages/server-ai/src/file-understanding/file-understanding.controller.ts
- 证据来源：C5-关键决策.md §D8；implementation/{05-接口.md 七鉴权矩阵与「看似无守卫」的解释/八错误语义, 01-架构.md 关键不变量 4}
- 详细资产：.module-experts/后端专题/文件理解与记忆专家/ C5-关键决策.md §D8 · implementation/05-接口.md §七