---
groupPath: 接口信息/项目协作
relation: 项目 API
exportedAt: "2026-10-16T03:52:14.870Z"
---
**项目协作接口**（前端调用视角，真实路径）

- 基址常量：API_XPERT_PROJECT（@core/constants/app.constants）
- GET {API_XPERT_PROJECT}/my —— 我的项目分页（IPagination<IXpertProject>）
- GET {API_XPERT_PROJECT}/types —— 项目类型目录（XpertProjectTypeCatalog）
- GET {API_XPERT_PROJECT}/type-entry —— 类型入口解析（XpertProjectEntry）
- GET {API_XPERT_PROJECT}/:id —— 项目详情（IXpertProject）
- 任务面：经 @core XpertTaskService（项目任务的动作入口）
- 前端：XpertProjectApiService / XpertProjectFacade（features/project）