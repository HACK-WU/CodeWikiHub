# Xpert 工作台专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：父专家（前端专题）
- **资产路径**：`.module-experts/前端专题/Xpert 工作台专家/`
- **入口路由**：`/xpert/x/:id/**`（管理页 + Studio 链）· `/xpert/tool/:id` · `/xpert/w/*` · `/xpert/knowledges/*`
- **职责**：本域是「**一个宿主壳 + 一层投影服务 + 一层纯函数草稿层**」的三段结构：`XpertAssistantShellComponent` 常驻全 `/xpert/**`，提供助手门面并渲染共享助手（ChatKit pet）；`XpertComponent` 是 `/xpert/x/:id` 的详情宿主，用组件级 `providers: [XpertService]` 把「路由参数 / 服务端原文 / 草稿优先投影」三信号暴露给各子页面；全部跨域复用收敛到三件套——`XpertService`（投影与发布广播）、`utils.ts`（注入工厂 + key 生成器族）、`draft/`（`bu
- **覆盖目录**：
  - `apps/cloud/src/app/features/xpert（除 studio；192 非 spec / 93 spec）`
  - `子域：knowledge 87 · workspace 32 · tools 26 · draft 4 · assistant-shell 3`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改助手管理页骨架/页头**（`:id` 宿主、侧栏标题、页签）→ `XpertComponent`、`xpert/routes.ts`。
  - 改基础信息编辑**（名称/标题/头像/tags/copilotModel）→ `XpertBasicComponent`（`implements IsDirty`，读草稿优先投影）。
  - 改管理动作**（删除/复制/导出 DSL/导入 DSL/同步模板）→ `XpertBasicManageComponent` + `import-dsl.util.ts`。
  - 改助手切换器与创建向导入口**（同工作区候选、按 type 分流）→ `XpertHeaderSwitcherComponent` + `blank/`（`XpertNewBlankComponent`）。
  - 配工具集**（openapi/odata/mcp 创建、内置工具参数、授权与凭据、工具测试）→ `tools/`（`XpertStudioCreateToolComponent`、`XpertStudioAPIToolComponent`、`XpertToolsetToolTestComponent`）。
  - 改草稿装配 / 节点与连线默认结构 / 触发器节点**→ `draft/editable-draft.util.ts`、`draft/xpert-draft-trigger.util.ts`。
- **测试状态**：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
