# 设计评审报告（REQ-20261103-001）

> 文档：`design/DESIGN.md` + S01~S06 子设计
> 格式：design-craft
> 评审时间：2026-11-03
> 增量再审：2026-11-03（见文末「增量再审」；当前结论以增量再审为准）
> 评审范围：文档一致性、能力白名单/默认拒绝、数据源与删除边界、安全基线、既有契约兼容
> 说明：本评审以文档为对象，未做运行时实测；代码现状结论来自文档引用的文件路径与行号。

## 评审结论

**⚠️ 有条件通过（剩余 🟡 均为已记录的 v1 边界）**

- 🔴 阻断 3 项：已全部修复并回写文档。
- 🟡 警告 8 项：5 项已修复；3 项为已接受的 v1 边界。
- 🟢 建议 2 项：后续演进项。

## 🔴 阻断（已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| 1 | 正确性/安全 | S-03 §3.2 | 未定义 Token 的能力集合；若 Token 直接拿 `ALL_CAPABILITIES`，会新增 `users.manage` / `tasks.delete`，既有 Token 被扩权 | 新增 `TOKEN_CAPABILITIES`，排除 `users.manage` / `tasks.delete`；Token 仍受 scope 约束 |
| 2 | 一致性/安全 | S-03 §3.6、S-04 §3.6 | 文档承诺「自己的会话」，但 `chat-store` 没有 owner 字段；多用户下 viewer/editor 可读/删他人会话 | 新增 `ownerUserId`：admin 看全部，editor/viewer 只看/改自己的，旧会话仅 admin |
| 3 | 安全/可恢复性 | S-01 §3.4、S-04 §3.5 | 只保护了「删除/降级最后一个 admin」；`PATCH disabled=true` 仍可把最后一个 admin 禁用，导致锁死 | 删除/降级/禁用三个入口统一走 store 层 `USER_LAST_ADMIN` 保护 |

## 🟡 警告（已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| 4 | 正确性 | S-06 §3.2 | 原要求 Origin 的 scheme + Host + port 同源；TLS 在代理终止时服务端看到 http、浏览器 Origin 是 https，会误拒正常请求 | 改为比较 host + port，scheme 允许 http/https；不信任 `X-Forwarded-Proto` |
| 5 | 完整性 | S-03 §3.3 | `public` / `authenticated` 未建模，`/api/auth/password` 写成「已登录」，破坏「每个路由都有 capability」的覆盖率规则 | 新增 `PermissionSpec = Capability | 'public' | 'authenticated'`，路由表显式标注 |
| 6 | 正确性 | S-06 §3.2 | 无 body 的 POST（如 logout）会被 Content-Type 校验误伤 | 仅在存在请求体时校验 Content-Type；无 body 跳过 |
| 7 | 一致性 | S-03 §3.3 | `/api/users*` 用通配符，覆盖率测试无法逐项断言；chat 路由也未说明枚举来源 | 拆成显式 `/api/users` 与 `/api/users/:id` 行；注明 chat 路由由 `chat-routes.ts` 枚举并纳入覆盖率测试 |
| 8 | 质量 | DESIGN.md §1 | 父文档缺少非功能性假设（并发、部署形态、会话持久性） | 已补：单机单 daemon、账号 < 10、局域网 HTTP、会话内存态 |

## 🟡 警告（保留，已接受的 v1 边界）

| # | 维度 | 位置 | 说明 |
|---|---|---|---|
| 9 | 可用性 | S-02 D1 | 会话存内存，daemon 重启需重新登录；已作为 v1 决策记录 |
| 10 | 安全 | S-06 D5 | HTTP 下不设 Cookie `Secure`；TLS 由代理/部署层负责，文档已写明 |
| 11 | 安全 | S-02 D5 | 登录限速为内存计数，daemon 重启清零；单机低并发下可接受 |

## 🟢 建议（后续演进）

| # | 维度 | 建议 |
|---|---|---|
| 12 | 可审计 | 增加用户操作审计日志（登录、写操作、用户管理），可直接复用 `TaskRecord.operator` 的快照思路 |
| 13 | 可用性 | 若远程使用频繁，增加会话持久化（`web-sessions.json`）或多实例共享会话 |

## 📊 评审统计

| 维度 | 🔴 | 🟡 | 🟢 | 合计 |
|---|---:|---:|---:|---:|
| 完整性 | 0 | 1 | 0 | 1 |
| 质量 | 0 | 1 | 0 | 1 |
| 正确性 | 1 | 2 | 0 | 3 |
| 安全 | 2 | 1 | 0 | 3 |
| 一致性 | 0 | 1 | 0 | 1 |
| 体验 | 0 | 0 | 0 | 0 |
| 合计 | 3 | 6 | 0 | 9 |

> 另有 3 项已接受的 v1 边界（#9~#11）与 2 项后续建议（#12~#13），不计入上表阻断/警告统计。

## 下一步

1. 文档已按上表修复并回写。
2. 可进入增量再审（仅复核 #1~#8 的修订段）或直接进入 challenger 二次质疑。
3. 编码前仍需补充：`design/design-review.md` 的注册、实施计划与测试计划。

---

# 增量再审（2026-11-03）

> 基于上一轮评审报告（同文件）；修订范围：S01~S06 与父文档的修复段。
> 结构未发生重排，执行增量评审；上一轮未涉及的通过项维持原判。

## 前次问题验证

| # | 前次问题 | 严重度 | 状态 | 说明 |
|---|---|---|---|---|
| 1 | Token 能力集合缺失，可能扩权 | 🔴 | ✅ 已修复 | 新增 `TOKEN_CAPABILITIES`，排除 `users.manage` / `tasks.delete` |
| 2 | 聊天会话无 owner，可读/删他人会话 | 🔴 | ✅ 已修复 | 新增 `ownerUserId` + 全子路由 owner 校验 |
| 3 | 最后 admin 可被禁用锁死 | 🔴 | ✅ 已修复 | 删除/降级/禁用统一走 `USER_LAST_ADMIN` |
| 4 | Origin 的 scheme 校验与 TLS 终止冲突 | 🟡 | ✅ 已修复 | 改为 host + port 比较，允许 http/https |
| 5 | `public` / `authenticated` 未建模 | 🟡 | ✅ 已修复 | 新增 `PermissionSpec`，显式标注 |
| 6 | 无 body 的 POST 被 Content-Type 误伤 | 🟡 | ✅ 已修复 | 仅在有请求体时校验 |
| 7 | `/api/users*` 通配路由无法覆盖 | 🟡 | ✅ 已修复 | 拆为显式路由；chat 路由注明枚举来源 |
| 8 | 父文档缺非功能假设 | 🟡 | ✅ 已修复 | 补单机/低并发/HTTP/内存会话 |
| 9~11 | 内存会话、Cookie Secure、内存限速 | 🟡 | 维持 | 已接受的 v1 边界 |
| 12~13 | 审计日志、会话持久化 | 🟢 | 维持 | 后续演进 |

## 新增发现（本轮修复）

| # | 维度 | 位置 | 问题 | 修改建议 / 已修复 |
|---|---|---|---|---|
| N1 | 一致性 | S-01 §3.1 / S-04 §3.5 | `disabled` 在 S-01 写成「v1 预留」，但 S-04 API 已支持 `disabled`，页面没有禁用/启用入口 | 已改为 v1 支持；CLI 新增 `disable/enable`；用户管理行新增「禁用/启用」 |
| N2 | 正确性 | S-02 §3.7 / S-06 §3.4 | 启动守卫用 `userCount()>0`；users.json 损坏时会退化成「无账号」并报 `MCP_HTTP_TOKEN_REQUIRED` | 改为 `enabledUserCount()`；损坏时 fail-loud `USER_STORE_CORRUPT` |
| N3 | 安全/一致性 | S-03 §3.7 / S-05 §3.5 | viewer 无 `datasource.read`，但任务详情参数里可能含数据源路径/远端 URL | 任务详情对无 `datasource.read` 的账号脱敏 `source/remoteUrl/subdir` |
| N4 | 安全 | S-03 §3.6 | `ownerUserId` 只写了列表过滤；archive/compact/images/messages 等子路由未明确校验 | 明确 `resolveConversationInScopes` 在所有子路由统一校验 owner；local/token 的 owner 为 null |
| N5 | 安全 | S-02 §3.6 | IP+用户名限速可被定向锁定（故意失败 5 次） | 已作为 v1 已知边界记录；后续加指数退避/验证码 |
| N6 | 体验 | S-04 §3.3 | `--no-local-admin` 时登录页仍显示「本机访问无需登录」 | `/api/auth/me` 返回 `localAdminEnabled`；登录页按值显示 |

## 📊 增量统计

| 类别 | 数量 |
|---|---:|
| 前次问题已修复 | 8 |
| 前次问题维持（已接受边界/后续建议） | 5 |
| 新增问题（本轮修复） | 6 |
| 新增未修复阻断 | 0 |

## 增量结论

**⚠️ 有条件通过（剩余均为已接受的 v1 边界）**

- 🔴 阻断 0；🟡 新增问题均已修复；剩余 3 项为已接受边界（内存会话 / Cookie Secure / 内存限速）与 2 项后续建议（审计 / 会话持久化）。
- 代码未做运行时验证；本结论只针对设计文档的一致性、完整性与技术合理性。

## 建议下一步

1. 进入 `challenger` 做二次质疑，重点挑战：能力白名单的路由覆盖率、聊天 owner 迁移、启动守卫与损坏文件处理。
2. 通过后补 `api-design` / `test-planner`，再进入 `plan-track` 实施。
