# 项目本体与资源子专家 · 专家名片

> ✅ **新建说明**：本包为**批次 5 首专家**（2026-10-16 创建，commit `80f5676fd`），由 Step 1 扫描报告 + 实现层/契约层 agent 产出；**未复跑 jest**（见 `test/known-failures.md` §3）。

- **类型**：子专家（项目与任务协作专家）
- **资产路径**：`.module-experts/后端专题/项目与任务协作专家/sub-experts/项目本体与资源子专家/`
- **职责**：本子专家负责 **「项目是什么、谁能用、挂了什么资源、发生过什么」**：`XpertProject` 聚合根与项目类型/应用安装解析（`XpertProjectTypeService`）、成员与 token 邀请（`XpertProjectMembershipService` / `XpertProjectInvitationService`）、四层准入（`guards/**` + `XpertProjectAccessService` / `ProjectAccessRuntimeService`）、资源挂载（五组 M2M + 助手家族归一 `XpertProjectXpertBindingService`）、卷内容与资产索引（`XpertProjectContentService` / `XpertProjectWorkspaceFilesService` / `XpertProjectAssetService`）、活动流（`XpertProjectActivityService`）、旧版自动化只读遗留面，以及平台级业务领域字典（`BusinessAreaService`）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert-project 的项目本体面（project.controller 本体部分 · invitation · admin · guards/** · project-access.module · services/project-{type,access,access-runtime,membership,invitation,activity,automation,asset,file}*）`
  - `server/src/business-area`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 四层准入的判定次序不可绕过：`@Public()` 只跳过全局 JWT 守卫；真正准入是类级 `XpertProjectAuthGuard → XpertProjectFeatureGuard → XpertProjectPermissionGuard` + `@ProjectPermission`，方法级再叠 `XpertProjectGuard`/`XpertProjectOwnerGuard`，最后是服务层断言。
  - `projectTypeSnapshot` 是创建瞬间固化的展示快照：源码注释逐字「display snapshots never authorize app execution」；`resolve()` 永远按当前已加载插件重解析，快照不能复活已下线类型，`projectTypeSnapshot` 也绝不授权应用执行。
  - `xpert_project_member` 已 `@deprecated` 但仍在双写：注释逐字「Legacy relation. Use memberships and the Project membership API; no startup backfill is performed.」；`addLegacyMember`/`removeLegacyMember`/`syncLegacyMembership` 仍维护它，而授权**完全不读**该关系。
  - M2M 挂载唯一性靠服务层幂等而非显式唯一索引：五组 `@JoinTable` 为 TypeORM 隐式联接表，去重由 `normalize`/`contains`（家族级）、`existingAttachmentIds` 差集、`xpert_project_asset` 的 `@Index(['projectId','path'], { unique: true })` + `withDeleted` 复用共同保证；`[推测]` 隐式联接表在 DB 侧以复合主键去重。
  - 邀请 token 的校验完全在服务层：`XpertProjectInvitationController` 无项目守卫；`tokenHash` 为 `select: false` + `@Exclude`，查询必须显式 `.addSelect('invitation.tokenHash')`；过期时**先落 `status='expired'` 再抛错**，同项目同邮箱至多一条 pending 由部分唯一索引兜底。
  - 活动流的写入点是显式枚举的：① 侧 6 处（`project.created`/`project.updated`/`project.archived`/`asset.created`/`automation.created`/`project.admin-intervened`），其中管理员介入在事务内直写仓储、**绕过 `sanitizeActivityPayload` 脱敏**。
- **测试状态**：本子域 spec 清单（23 + 1）（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
