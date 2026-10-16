---
groupPath: 数据流/Assistant 定义与运行时
relation: environment
exportedAt: "2026-10-16T03:52:14.870Z"
---
【数据流｜environment】
- 实体类型：表（Environment）
- 结构：工作区维度环境变量集（`variables[]`，出参经 EnvironmentPublicDTO 抹掉 `value`）；`/default/:workspaceId`、`/:id/as-default` 语义
- 生产方：/api/environment/* 的 CRUD（EnvironmentModule）
- 主要消费方：xpert-workspace（工作区默认环境）、plugin-resource（安装时注入）、xpert（environmentId 引用）[基于引用扫描，未深入验证]
- 业务用途：**工作区级环境变量数据**（不是进程环境变量），供助手运行与插件安装注入
- 详细流向：见 .module-experts/后端专题/Assistant 定义与运行时专家/C4-数据流向与消费.md