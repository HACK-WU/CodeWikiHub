---
id: REQ-20261103-001
feature: Web 账号登录与只读权限
status: 设计中
created: 2026-11-03
updated: 2026-11-03
version: 1
tags: [auth, web, security, ux]
depends_on: []
author: AI
document_type: design
---

# S-04 登录页与用户管理

> 父设计：[DESIGN.md](./DESIGN.md)
> 依赖：S-02（登录会话）、S-03（能力矩阵）
> 关联需求：[requirement.md](../requirement.md)
> 已确认布局：[requirement.md §7](../requirement.md#7-直观视图新增变更界面已确认)（登录页 / 用户管理页 / 任务操作者列 / editor 数据源只读态）

## 1. 术语

| 术语 | 含义 |
|---|---|
| `AuthProvider` | 前端身份上下文：当前用户、权限、`can()`、刷新 |
| `RequireAuth` | 路由守卫：匿名远程跳 `/login` |
| `can(capability)` | 前端唯一的权限判断入口 |
| 本机管理员 | `/api/auth/me` 返回 `source:'local'`，显示「本机管理员 · 无需登录」 |
| 角色徽标 | 顶栏用户名旁展示 管理员 / 读写账号 / 只读 |

## 2. 现状（AS-IS）

- 路由只有 9 个页面（`web/src/router/routes.tsx:12-36`），没有 `/login`、`/users`。
- `AppShell` 顶栏右侧依次为 AI 对话 / 任务 / Scope / 服务状态（`web/src/layouts/AppShell.tsx:591`）；没有用户菜单。
- `httpApi.req()` 只设 `Content-Type`，不带 Cookie / Token（`web/src/api/httpApi.ts:250-255`）；Cookie 由浏览器同源自动携带，无需改 `req()`。
- 页面写操作大量直接调用 API / MCP 工具；没有统一的 `can()` 判断。

## 3. 方案（TO-BE）

### 3.1 前端身份上下文

```ts
// web/src/lib/authContext.tsx
interface AuthState {
  status: 'loading' | 'authenticated' | 'anonymous';
  source: 'local' | 'session' | 'anonymous';
  localAdminEnabled: boolean;
  user: { id: string | null; username: string; role: Role } | null;
  permissions: Capability[];
  can: (capability: Capability) => boolean;
  refresh: () => Promise<void>;
}
```

- 应用启动时 `GET /api/auth/me` 一次；`status:'loading'` 时渲染骨架，不闪登录页。
- 401 统一接入（覆盖 API / MCP / SSE）：
  - `web/src/lib/authEvents.ts` 提供 `notifyUnauthorized(source)`；
  - `httpApi.req` 收到 401 时触发（`/api/auth/login` 除外，登录失败在表单内处理）；
  - `mcpClient.callTool` 捕获 401（StreamableHTTPError）后触发；
  - chat SSE fetch 收到 401 时触发；403 只做行内错误，不跳登录；
  - `AuthProvider` 只监听一次，清空身份 → 带 `from` 跳 `/login`；同一时间只处理一次，避免重复跳转。
- `can()` 基于服务端 `permissions`，**禁止**在前端写 `role === 'editor'`。

### 3.2 路由与守卫

```tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route path="/*" element={
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  } />
</Routes>
```

- `/login` 独立渲染，不套 `AppShell`；已登录访问 `/login` 自动回首页。
- `RequireAuth`：`loading` → 骨架；`anonymous` → `<Navigate to="/login" replace state={{ from }} />`；`authenticated` → 子路由。
- 本机管理员 `source:'local'` 直接视为已登录，不显示登录页。

### 3.3 登录页

布局引用需求文档 §7.2（已确认）。状态：

| 状态 | 呈现 |
|---|---|
| 默认 | 用户名 + 密码 + 登录按钮；仅当 `localAdminEnabled=true` 时显示「本机访问（127.0.0.1）无需登录」，关闭后不显示 |
| 提交中 | 按钮 loading，禁用输入 |
| 凭证错误 | 行内「用户名或密码不正确」；不区分账号不存在 |
| 限速 | 「尝试过于频繁，请 5 分钟后再试」；按钮禁用倒计时 |
| 无账号 | 「尚未创建账号，请在本机执行 `ki user create <用户名>`」 |
| 账号文件损坏 | 「账号数据不可读，请在本机运行 `ki user list` 检查」 |
| 网络错误 | 「暂时无法连接服务」+ 重试 |

交互：

- 用户名、密码必填；回车提交；密码可见性切换。
- 登录成功按 `from` 回跳；无 `from` 回 `/`。
- 不把错误详情（是否存在该用户）暴露给用户。

### 3.4 顶栏用户菜单

布局引用需求文档 §7.1。菜单项按能力显示：

| 菜单项 | 显示条件 | 行为 |
|---|---|---|
| 用户管理 | `can('users.manage')` | 跳 `/users` |
| 修改密码 | `source === 'session'` | 打开修改密码弹窗 |
| 退出登录 | `source === 'session'` | 调 logout，清上下文，回 `/login` |
| 本机管理员 · 无需登录 | `source === 'local'` | 只展示，不提供退出 |

- 用户名过长省略，`title` 显示全量；角色徽标用中性色，不用危险色。
- 修改密码成功后提示「其他设备已退出登录」，当前会话保留。

### 3.5 用户管理页 `/users`

布局引用需求文档 §7.3 / §7.4。仅 `can('users.manage')` 可进入；否则 403 页。

- 列表列：用户名、角色、状态、最近登录、操作。
- 新建：用户名、初始密码、角色三选一（管理员 / 读写账号 / 只读账号）；密码可显示/隐藏；创建后列表刷新。
- 行操作：切换角色、重置密码、禁用/启用、删除。禁用后该账号立即无法登录，现有会话失效；启用后恢复登录。
- 保护：
  - 最后一个 admin 不能删除、降级或禁用；前端禁用按钮 + 服务端 409 双保险。
  - 删除自己且会导致无 admin → 拒绝。
  - 删除前二次确认，文案说明「该账号的会话将立即失效」。
- 空态：尚无账号时提示「本机访问仍可直接以管理员身份使用；远程登录需先创建账号」。

API 契约：

```ts
GET    /api/users                 → { ok: true, users: UserView[] }
POST   /api/users                 → { ok: true, user: UserView }        // {username,password,role}
PATCH  /api/users/:id             → { ok: true, user: UserView }        // {role?, password?, disabled?}
DELETE /api/users/:id             → { ok: true }
POST   /api/auth/password         → { ok: true }                        // {oldPassword,newPassword}
```

Demo：

```json
{
  "ok": true,
  "users": [
    { "id": "admin1", "username": "admin", "role": "admin", "disabled": false,
      "createdAt": "2026-11-03T06:00:00.000Z", "lastLoginAt": "2026-11-03T06:10:00.000Z" },
    { "id": "viewer1", "username": "guest", "role": "viewer", "disabled": false,
      "createdAt": "2026-11-03T06:05:00.000Z" }
  ]
}
```

### 3.6 能力驱动的页面显隐

| 页面 / 操作 | viewer | editor | admin |
|---|---|---|---|
| 总览 / 浏览 / 检索 / 任务 / 资源 | ✅ | ✅ | ✅ |
| 上传导入 / 知识写入 | ❌ 隐藏导航 | ✅ | ✅ |
| AI 对话 | ✅（工具只读） | ✅（写工具） | ✅ |
| 数据源页 | ❌ 无入口 | ✅ 列表/详情只读；写/删全部禁用 | ✅ |
| 数据源详情「移除」/「删除待删文档」 | ❌ | ❌ | ✅ |
| 任务详情删除/清理 | ❌ 不渲染 | ❌ 不渲染 | ✅（未来接口） |
| 用户管理 | ❌ | ❌ | ✅ |
| 运维操作（restore/清理/优化） | ❌ | ❌ | ✅ |

- viewer 顶部常驻只读横幅（需求 §7.5）；写按钮 `disabled` + `title="当前账号为只读"`。
- editor 数据源页顶部常驻说明（需求 §7.7 方案 B）；所有操作按钮不渲染，避免“可点但 403”。
- 403 响应：页面级 `Notice` + 行动建议（联系管理员 / 切换账号），不只弹 toast。
- 聊天会话列表按 `ownerUserId` 过滤：admin 看全部；editor/viewer 只看自己的；旧会话无 owner 仅 admin 可见。前端不展示“切换查看他人会话”的入口。
- 旧会话空态：editor/viewer 无自己的会话时显示「当前账号还没有会话；功能上线前的历史会话仅管理员可见」，不显示“数据丢失”。
- admin 会话列表对 `ownerUserId` 缺失的条目显示「未归属」徽标，可直接删除；v1 不提供“认领”操作。

### 3.7 任务页操作者列（与 S-05 联动）

- 列表在「来源」后新增「操作者」；窄屏 ≤880 隐藏该列，详情抽屉始终显示。
- 操作者只读展示；不提供排序/筛选（v1）。
- 任务取消按钮仅 `can('tasks.cancel')` 显示；任务删除仅 `can('tasks.delete')`。

### 3.8 关键决策

| 决策 | 采用 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 权限判断 | 服务端 `permissions` + `can()` | 前端按角色硬编码 | 角色变更/新增角色会双源漂移 |
| 登录页形态 | 独立 `/login` 路由 | 弹窗 / AppShell 内联 | 深链、刷新、未登录首屏都更简单 |
| 无权限入口 | viewer 隐藏写页面；editor 保留数据源只读 | 一律显示并置灰 | 数据源页对 viewer 无意义，隐藏减少噪音 |
| 401 处理 | 统一拦截 + 跳登录 | 每页单独处理 | 避免遗漏与循环重定向 |

### 3.9 异常处理

| 场景 | 行为 |
|---|---|
| `/api/auth/me` 失败 | 显示「无法连接服务」+ 重试；不直接跳登录，避免服务故障时误判 |
| 登录后 `/api` 401 | 清上下文 → `/login`；保留 `from` |
| 403 `USER_READONLY` | 行内提示只读；不跳转 |
| 403 `DATA_SOURCE_FORBIDDEN` | 数据源页顶部提示；不渲染操作按钮 |
| 403 `OPS_FORBIDDEN` | 提示联系管理员 |
| 最后一个 admin 操作失败 | 行内错误 + 按钮回弹 |
| 用户列表 503 `USER_STORE_CORRUPT` | 页面级错误 + `ki user list` 指引 |

### 3.10 影响范围

| 文件 | 变更 |
|---|---|
| `web/src/api/authApi.ts` | 新增登录/登出/me/改密/用户 CRUD |
| `web/src/lib/authEvents.ts` | 新增 `notifyUnauthorized()`，API/MCP/SSE 共用 |
| `web/src/lib/authContext.tsx` | 新增 AuthProvider / `can()` / 监听 401 事件 |
| `web/src/api/mcpClient.ts` | MCP 401 触发统一事件 |
| `web/src/api/chatApi.ts` | chat SSE 401 触发统一事件 |
| `web/src/router/routes.tsx` | 新增 `/login`、`/users`、`RequireAuth` |
| `web/src/pages/LoginPage.tsx` | 新增 |
| `web/src/pages/UsersPage.tsx` | 新增 |
| `web/src/layouts/AppShell.tsx` | 用户菜单、角色徽标、能力驱动导航 |
| `web/src/pages/DataSourcePage.tsx` | editor 只读态、删除按钮禁用 |
| `web/src/pages/TasksPage.tsx` | 操作者列、取消/删除权限 |
| `web/src/styles/ki.css` | 用户菜单、登录页、用户管理页、只读横幅 |

### 3.11 验收标准

- 远程未登录打开任意页面 → 登录页；登录后回原页；本机 localhost 直接进入且显示「本机管理员」。
- viewer：看不到上传导入/知识写入/数据源/用户管理入口；所有写按钮不可用；聊天可用但工具只读。
- editor：可导入/写入/编辑/聊天写工具；数据源页可看列表/详情，所有操作按钮不可见；删除相关接口 403。
- admin：全部入口可见；用户管理可创建/改角色/重置/禁用/启用/删除；最后一个 admin 保护在删除、降级、禁用三处均生效。
- 所有 403 都有可操作提示；无死链、无“点了没反应”。
- 会话过期时，API / `/mcp` / chat SSE 任一通道触发 401 都只跳一次登录页，不重复弹错、不死循环。
- editor/viewer 打开无自己的会话时看到「历史会话仅管理员可见」说明；admin 看到旧会话「未归属」徽标。
