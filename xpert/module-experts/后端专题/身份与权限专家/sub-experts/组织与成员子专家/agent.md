# 组织与成员子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（身份与权限专家）
- **资产路径**：`.module-experts/后端专题/身份与权限专家/sub-experts/组织与成员子专家/`
- **职责**：定位**：本子专家是「身份 / 组织 / 成员 / 邀请 / 用户组」五件事的写路径负责人，覆盖 `user`、`user-organization`、`user-group`、`organization`、`organization-language`、`organization-contact`、`employee`、`invite` 以及事实上的死模块 `contact` 共九个模块。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/organization`
  - `server/src/user-organization`
  - `server/src/organization-contact`
  - `server/src/organization-language`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - `invite.email` 全局唯一，查重只按租户。现象：跨租户对同一邮箱发邀请会直接撞数据库唯一约束，而不是返回业务 400。触发条件：被过滤逻辑放行（`createBulk` 只在当前 `tenantId` 内比对有效邀请与已存在用户）。正确做法：邀请前自行确认全局未被占用，或复用同一行（`resendEmail` 的做法）。
  - 员工邀请的接受路径已退化。现象：文档声称「注册用户 → 建 employee → 置 ACCEPTED」，实现只做注册 + 置 ACCEPTED；`updateEmployeeMemberships` 是空实现，EMPLOYEE 类型邀请也不发信。触发条件：调用 `POST /api/invite/employee`。正确做法：不要依赖该端点产出 `employee`，改用员工创建 / 导入链路。
  - `invite_organization_contact` 是 M2M，语义未定（源码带 TODO）。现象：接受联系人邀请时只更新 `invite.organizationContact[0]`，建邀请时也只写单元素数组。触发条件：同一邀请挂多个联系人。正确做法：按「一邀请一联系人」使用，不要依赖顺序之外的关系。
  - 成员不变量禁止绕过 service 直写仓储。现象：直接改 `user_organization` 仓库会破坏「唯一默认组织」「至少一个活跃成员」「最后一条成员关系不可删」「删除后默认组织补位」,并不会刷新当前用户 feature 缓存版本、也不会发出成员创建 / 删除事件。正确做法：所有成员写操作走 `UserOrganizationService`。
  - 超级管理员不是组织成员。现象：`POST /api/user-organization` 对超管返回 400（"Super admin users are not organization members."）；查询 / 更新 / 删除命中超管成员时同样 400。正确做法：超管的组织可见性由角色推导（`isActiveMemberOfOrganization` 对超管直接放行），不要为其建成员关系。
  - 托管组元数据在 HTTP 路径被静默剥离。现象：请求体带 `managedBy` / `managedEntityType` / `managedEntityId` 不报错但不生效。触发条件：`POST/PUT /api/user-groups`。正确做法：托管组只由平台侧直写仓储创建（三列同时非空时受部分唯一索引约束）。
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
