---
groupPath: 数据流/身份与权限
relation: employee
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜employee】
- 实体类型：表（Employee extends TenantOrganizationBaseEntity）
- 结构：isActive、valueDate/startedWorkOn/endWorkOn 日期族、payPeriod、billRateValue(numeric)、totalWorkHours、userId（非空，1:1 用户，onDelete CASCADE）
- 生产方：EmployeeService.createBulk（经基类 create）、员工 seed（默认员工含明文测试密码）
- 主要消费方（2 个模块）：employee、shared（组织权限守卫按 employee.organization[p] 旧列判权）
- 业务用途：用户在某组织下的员工维度档案，也是 employeeId 进入 token payload 的来源
- 详细流向：见 .module-experts/后端专题/身份与权限专家/C4-数据流向与消费.md