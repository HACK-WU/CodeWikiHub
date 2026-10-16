# 运行时API与准入子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Assistant 定义与运行时专家）
- **资产路径**：`.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/运行时API与准入子专家/`
- **职责**：本子专家只负责「Assistant **已发布之后，谁能通过 HTTP 跑到它**」——即 **运行时对外面 + 多受众准入**。它不定义 Assistant，也不实现文件卷、工作区与模板。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/ai`
  - `server-ai/src/xpert/published-xpert-access.service.ts`
  - `server-ai/src/xpert/enterprise-chatkit-*`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 真实前缀是 `/api/ai/assistants`：全局前缀 `api` + `RouterModule.register([{ path: '/ai' }])` + `@Controller('assistants')`；**不存在 `/api/assistants`**，也不存在无前缀的 `/api/xpert` 之外的别名。
  - `AssistantsController` 是 `@Public()`，全靠守卫兜底：类级 `@Public()` + `@AllowClientSecretBindings(SecretTokenBindingType.ENTERPRISE_XPERT)` + `@UseGuards(ApiKeyOrClientSecretAuthGuard)`；`@Public()` 只关闭全局 JWT，**不产生匿名可用性**。新增方法忘挂绑定即静默扩大受众面。
  - 受众与目标 assistant 必须匹配：`getAccessiblePublishedXpert` 在加载实体**之前**先做 audience 断言（public / enterprise / user 三处 `!== id` 即 403），运行期再由 `assertPublicChatAppXpert` / `assertEnterpriseChatAppXpert` / `assertCurrentUserAccess` 复查应用开关与组织。
  - 准入查询强制 `publishAt` 非空 + `latest`：各 `build*Query` 与 `getPublishedXpertInTenant`（`publishAt: Not(IsNull())`）都硬编码该约束；`latest` 只在调用方把它放进 `where` 时生效（`findEnterpriseH5Xpert` 另有 `latest = true`）。**源码校正**：`publishAt` 约束**不在** `applyPublishedFilters` 内，父级旧口径需按此为准。
  - `TENANT_SHARED_WORKSPACE_FILTER` 用原生 SQL 读 `settings` json：与 `applyPublicChatAppFilter` / `applyEnterpriseChatAppFilter` 直读 `workspace.settings->access->visibility`、`xpert.app->>'public'`、`app->channels->...`；`COALESCE(..., 'private' | 'false')` 的失败方向是收紧（安全），但字段改名会静默改变可见性且无编译期保护。
  - Enterprise bootstrap 在身份校验之前：`GET .../bootstrap` 只回 `toEnterpriseH5PublicXpert` 的 12 个白名单字段 + `platform` + `clientConfig`（任何拿到 slug 的人都能读到助手名/描述/头像/starters/features）；`POST .../session` 才走 `resolveContext` → `exchangeIdentity` → `assertIdentity`（provider / externalOrganizationId / subjectId / accountBinding 五项全等）。
- **测试状态**：[packages/server-ai/src/ai/ai-v1.controller.spec.ts](file://packages/server-ai/src/ai/ai-v1.controller.spec.ts)（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
