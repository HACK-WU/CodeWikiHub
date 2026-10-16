---
groupPath: 关联关系/身份与权限
relation: invite-三条接受路径与注册链
exportedAt: "2026-10-16T03:52:14.870Z"
---
[强关联] invite 状态机 与 三条接受路径 + 注册链
强度：必改——改 `IInviteAcceptInput` / `IOrganizationContactAcceptInviteInput` 字段或邀请状态枚举语义 → 三条 @Public 接受端点、对应 Command/handler、注册事务与前端表单必改；改邀请服务内部实现 → 端点不用管
原因：邀请接受是「未登录用户走注册」的入口，三条路径的业务后果不同（建成员 / 仅置状态 / 新建租户+组织），字段与状态机是它们的共同契约

邀请端：
- Invite / InviteStatusEnum（token 唯一、email 全局唯一、无 EXPIRED 态）@ packages/server/src/invite/invite.entity.ts
- InviteService.createBulk / validateByToken / sendAcceptInvitationEmail @ packages/server/src/invite/invite.service.ts
- InviteController.acceptUserInvite / acceptEmployeeInvite / acceptOrganizationContactInvite @ packages/server/src/invite/invite.controller.ts

接受链端：
- invite.accept-user.handler.ts / invite.accept-employee.handler.ts（employee 创建整段被注释）/ invite.accept-organization-contact.handler.ts @ packages/server/src/invite/commands/handlers/
- AuthService.register @ packages/server/src/auth/auth.service.ts
- UserOrganizationService.create / OrganizationCreateCommand（联系人路径新建租户+组织）@ packages/server/src/{user-organization,organization}/