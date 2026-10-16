# 工作区子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后重建（实现层与契约层由子 agent 按 ki 记忆 + 源码产出；原包基线 commit `c07bb83d`/2026-10-15，现仓库 `80f5676fd`，模块计数按重建时实测）。测试结论沿用原包实测记录，**重建后未复跑**。

- **类型**：子专家（Xpert 工作台专家）
- **资产路径**：`.module-experts/前端专题/Xpert 工作台专家/sub-experts/工作区子专家/`
- **入口路由**：`/xpert/w/**`（工作区列表/详情/成员/文件/设置）
- **职责**：本子域是「**一个宿主壳 + 一族资源页 + 一个设置对话框 + 一个文件 façade**」：`XpertWorkspaceHomeComponent` 常驻 `:id` 子树并集中持有工作区实体与门控信号，子页面只 `inject` 读；设置面与文件面是对话框 / 独立组件；所有出向依赖只到 `@core`、`@shared` 与 `@xpert-ai/headless-ui`。
- **覆盖目录**：
  - `apps/cloud/src/app/features/xpert/workspace（33 非 spec / 14 spec）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 改工作区列表 / 切换 / 默认工作区**（搜索、owner 标记、设为默认但不切换选中）→ `home/home.component.ts`。
  - 改工作区详情取数**（列表项即详情、`equal: a?.id === b?.id`、设置对话框才单独 `getOneById`）→ `home/home.component.ts`、`settings/settings.component.ts`。
  - 改设置面**（对话框三页签 general / members / apiKeys、`workspaceRevision` 重取）→ `settings/settings.component.ts`。
  - 改可见性三态与改名**（`shared` 开关、`isTenantWorkspace` 推导、失败保留 `savedVisibility`）→ `settings/general/general.component.ts`。
  - 改成员呈现**（整体覆盖写、owner 展示与排除、`UserRoleSelect` 排除已有成员）→ `settings/members/members.component.ts`。
  - 改路由入口 / 守卫 / `section` 映射**（`redirectToSelectedWorkspace`、`settings` 段重定向）→ `workspace/routes.ts`。
- **测试状态**：93 spec = 36 PASS / 55 FAIL（53 环境级缺依赖 + 2 真实断言；2026-10-15 基线实测，2026-10-16 重建后待复跑）（重建后未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md`
