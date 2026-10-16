---
groupPath: 数据流/Assistant 定义与运行时
relation: xpert_access_request
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜xpert_access_request】
- 实体类型：表（XpertAccessRequest extends TenantOrganizationBaseEntity）
- 结构：唯一索引 `(tenantId, organizationId, xpertId, requesterId)`；`status`、`reason`、`response`、`reviewedAt`、`reviewerId`、**`accessGroupId` → UserGroup**
- 生产方：XpertMarketplaceService.requestAccess（创建）、approveRequest（审批通过时**建/复用 UserGroup 并回写 accessGroupId**）、rejectRequest
- 主要消费方：xpert-marketplace（我的申请/待审申请/可运行性判定）、UserGroup（授权落地）[基于引用扫描，未深入验证]
- 业务用途：市场访问申请的单一真源，**授权最终落为 UserGroup 成员关系**（删组/改名会影响已审批访问）
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md