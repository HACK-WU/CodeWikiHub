---
id: REQ-20261104-001
feature: 用户管理页与个人中心改版
status: 实施中
created: 2026-11-04
updated: 2026-11-04
version: 2
tags: [auth, web, ux, feat]
depends_on: []
author: AI
document_type: report
---

# 实现报告：用户管理页与个人中心 v2

> 依据：`requirement.md`（REQ-20261104-001）
> 状态：真实产品已实现；当前未提交 git，等待用户验收
> 实现范围：后端账号/Token 模型与 API + 前端用户管理页/个人中心

## 1. 实现摘要

- 管理员进入「用户管理」；普通用户进入「个人中心」；成员列表仅管理员可见。
- 成员行只保留「编辑 / 删除」；点击行打开只读详情抽屉；抽屉宽度与数据源详情一致。
- 编辑弹窗集中管理权限、状态、有效期、密码重置与 MCP Token；密码/Token 均使用内联面板，互斥并有草稿保护。
- 后端新增账号有效期、唯一管理员与管理员保护、当前用户自我保护；登录/会话/Token 均按有效期与禁用状态实时判定。
- MCP Token 新增归属账号、名称、创建者；普通账号上限 10、管理员不限；viewer 强制只读；owner 禁用/过期/降级时实时失效或收紧；CLI 创建的 Token 默认归唯一管理员。
- 新增 `/api/me/tokens` 自助 Token API 与 `/api/users/:id/tokens` 管理员代管 API；列表不回传明文，明文只在创建响应出现一次。
- 新增 `/profile` 路由与用户菜单「个人中心」；非管理员访问 `/users` 重定向到 `/profile`。

## 2. 主要落点

| 层 | 文件 |
|---|---|
| 账号模型 | `src/lib/user-store.ts`、`src/lib/web-auth.ts`、`src/user.ts` |
| Token 模型 | `src/lib/mcp-token.ts`、`src/mcp-server.ts` |
| API | `src/lib/mcp-http-api.ts`、`src/lib/auth/capabilities.ts`、`src/lib/auth/route-permissions.ts` |
| 前端 API | `web/src/api/authApi.ts` |
| 前端纯模型 | `web/src/lib/usersPageModel.ts` + `web/test/users-page-model.test.mjs` |
| 前端页面/组件 | `web/src/pages/UsersPage.tsx`、`web/src/pages/ProfilePage.tsx`、`web/src/components/User*.tsx`、`web/src/styles/users-v2.css` |
| 路由/壳 | `web/src/router/routes.tsx`、`web/src/layouts/AppShell.tsx`、`web/src/App.tsx` |
| 测试 | `test/user-store.test.ts`、`test/mcp-token.test.ts`、`test/web-auth-api.test.ts`、`test/user-token-api.test.ts` |

## 3. 验证结果

### 3.1 后端

- `npm run build` exit 0。
- `user-store` 14/14；`mcp-token` 40/40；`web-auth` 10/10；`web-auth-api` 12/12；
  `user-token-api` 9/9；`mcp-http-api` 66/66；`capability-coverage` 4/4；`auth-security` 11/11（共 166 项）。
- 覆盖：唯一管理员、管理员保护/多管理员清理、有效期与过期登录/会话、Token 归属/上限/viewer 只读/owner 失效、CLI Token 默认归属、删除账号清 Token。
- auto-review 追加：历史双 admin 且只有一个启用中 admin 时，降级/禁用必须被 `USER_LAST_ADMIN` 拦住；禁用账号不能被提升为 admin；抽屉 Esc/焦点回行、模态焦点、时间本地化亦已复验。

### 3.2 前端

- `npm run typecheck` 0；`npm test` **861/861**；`npm run build` ✓。
- 真机（隔离 HOME + `--no-local-admin` daemon + preview）：
  - 管理员核心流程 **37/37**：登录、列表、抽屉、新建（含有效期）、编辑、内联 Token、未保存降级、密码重置 Enter/焦点、删除、个人中心 Token、viewer 菜单/重定向/只读 Token、390。
  - 过期/CLI/editor/390 **18/18**：过期行与抽屉、失效标记、过期账号仍可看 Token 但不能新建、CLI Token 归管理员、editor 可建读写 Token、390 无溢出。
  - 本机管理员 **7/7**：免登录进入用户管理、无「修改密码」按钮、个人中心可见 CLI Token、可创建 Token。
  - 长名/深色：长用户名 64 字不撑破成员表，长 Token 名 64 字在抽屉/编辑弹窗内省略；390 标题省略、关闭按钮可见；深色主题正常；无 console 错误。
- 期间发现并修复：**历史双 admin 的锁死风险（P0，只有一启用 admin 时仍可降级/禁用）**、**禁用账号可被提升为 admin（P0）**、时间显示误用 UTC、CLI 过期状态仍显示「启用」、Token 复制缺少非安全上下文兜底、CLI Token 默认 owner 未优先选启用中的 admin、抽屉 Esc 未关闭/焦点未回行、模态标题缺 `title` 提示。

## 4. 关键决策

1. **Token 权限收紧**：按 owner 当前角色动态收紧（viewer 的写 Token 生效为只读），不改写 Token 记录；账号升回 editor 后恢复读写。永久降级仍需产品拍板。
2. **本机管理员 Token owner**：若 users.json 有真实 admin 记录，本机管理员使用同一 owner，从而能看到/管理 CLI 创建的管理员 Token；无 admin 记录时退回 `local-admin` 虚拟 owner。
3. **历史多管理员**：Web 仍只允许一个管理员；存在多个历史 admin 时页面给出警告，CLI 可逐个清理（最后一个启用中的 admin 仍受保护）。
4. **表单与弹窗**：新建/编辑账号使用上标签；复用 `DateTimePicker`、`DetailDrawer`、`ChangePasswordDialog`；用户页样式独立 `users-v2.css`。
5. **无二级弹窗**：编辑弹窗内 Token 使用内联面板；个人中心创建 Token 使用弹窗（与 demo 一致）。

## 5. 残余风险 / 未完成（跟进后）

1. **多管理员 Web 管理**：Web 成员表过滤所有 admin，仅当前管理员卡可见；历史多个管理员需 CLI/人工清理（CLI 已允许清理多余 admin）。
2. **Token 明文误关**：创建后关闭弹窗仍会丢失明文，UI 仅做警告；如需强确认可后续补二次确认。
3. **未提交**：按项目约定未执行 git commit；`web/dist` 已重建但未提交。

## 6. 后续建议

- 用户验收后：更新需求状态为「已完成」，补提交信息并按需拆分提交（后端模型/API、前端页面、测试/文档）。
- 若要求 Token 降级永久生效，在保存账号时批量改写 owner 名下写 Token（并在 API 返回中明确）。
- 可选：Token 明文创建后的关闭强确认；历史多管理员的 Web 端处理入口。

## 7. 后续跟进（2026-11-04）

- **Token 存储锁**：新增 `mcp-tokens.json.lock`（O_EXCL、5s 超时、30s stale），覆盖 create/update/delete/按 owner 删除/adopt；4 进程并发写 40 条无丢更新，无 `.lock/.tmp` 残留；另有 4 进程并发尝试创建 40 次、上限 10 的测试，最终严格 10 条。
- **旧 Token 归属迁移**：新增 `ki mcp token adopt [--owner <admin>] [--id <tokenId>]`；默认唯一启用管理员（无 admin 记录时 local-admin），只迁移 ownerless 记录；迁移前旧 Token 仍可鉴权。`mcp-token` 39/39，CLI 真机验证默认 admin、非管理员拒绝、已归属拒绝。
- **UserDialog 焦点陷阱**：Tab/Shift+Tab 在弹窗内循环；嵌套确认 Esc 只关确认、焦点回撤销按钮；真机焦点 11/11 + 嵌套 3/3。
- **Token 表单高度**：≥700px 双列（1440×900 下 399+399，创建按钮在 footer 上方）；390 单列 304、无横向溢出；打开时滚动到可视。
- 验证：后端 build 0；mcp-token 40/40、user-token-api 9/9 等；web build ✓、861/861；真机焦点/布局 14/14。
