# 项目协作专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/项目协作专家/`
- **入口路由**：`/project`（列表）· `/project/invitations/accept` · `/project/:id`（概览/plan/timeline/tasks/assets/config）+ `type-entry`
- **职责**：定位**：本域是「**页面族 + 信号门面 + 端点面 + 入口解析**」四层结构。`/project/:id` 的 `XpertProjectShellComponent` 是唯一壳（页签、治理侧栏、遮罩、会话面板全部状态镜像到 URL query），六个子页与对话框族只读写 `XpertProjectFacade` 或 `XpertProjectApiService`；入口解析 `navigateProjectEntry` 与对话建项目桥 `chatProjectCreateRequest`/`executeChatProjectCreate` 是无状态纯函数，被列表页与对话域 ChatK
- **覆盖目录**：
  - `apps/cloud/src/app/features/project（25 非 spec / 13 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改项目列表或路由结构**（类型菜单、筛选、分页、DSL 导入、新增子页）→ [routes.ts](file://apps/cloud/src/app/features/project/routes.ts)、[project-list.component.ts](file://apps/cloud/src/app/features/project/project-list.co
  - 改项目数据加载与合并语义**（并发、序号守卫、伴生态、局部回填）→ [project.facade.ts](file://apps/cloud/src/app/features/project/project.facade.ts)。
  - 新增/调整项目端点调用**（成员、邀请、指令、技能、资产、计划、任务、自动化、工作区文件）→ [project-api.service.ts](file://apps/cloud/src/app/features/project/project-api.service.ts)（逐端点清单见 [C1-能力契约.md](file://.module-experts/前端专题/项目协
  - 项目入口跳转**（平台项目 vs 宿主应用视图、默认类型）→ [project-entry.ts](file://apps/cloud/src/app/features/project/project-entry.ts)。
  - 对话内建项目 / 选项目**（ChatKit `project.create`、`project.create-entry` 事件）→ [project-chat-create.ts](file://apps/cloud/src/app/features/project/project-chat-create.ts)（消费方在对话域 `clawxpert-conversatio
  - 计划 / 任务联动**（看板拖拽、冲刺、里程碑、任务抽屉与执行上下文）→ [project-plan.component.ts](file://apps/cloud/src/app/features/project/project-plan.component.ts)、[project-task-management.component.ts](file://apps/clou
- **测试状态**：13 spec = 4 PASS / 9 FAIL（全为环境级 @xpert-ai/store 缺依赖，无真实断言失败；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
