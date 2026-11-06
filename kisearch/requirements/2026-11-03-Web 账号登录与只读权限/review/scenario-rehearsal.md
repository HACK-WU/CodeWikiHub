# 场景推演：Web 账号登录与只读权限

> 推演时间：2026-11-03
> 推演对象：设计文档模式（requirement.md + design/DESIGN.md + S01~S06）
> 关联需求：REQ-20261103-001
> 证据性质：**推演结论（基于文档推理，未实际执行）**
> 增量复核：P1~P7 已修复；P1 见 §6，P2~P7 见 §7

## 1. 全局理解声明 + 角色清单

### 1.1 全局理解声明

- **业务目标**：给 Web 页面增加可登录账号（管理员 / 读写账号 / 只读账号），本机 localhost 免登录自动管理员，权限按能力白名单默认拒绝，任务台账记录操作者；与 MCP Token 完全独立。
- **系统位置**：上游为浏览器（本机/远程）、MCP 客户端、CLI、定时任务；本功能位于 HTTP 入口的 principal 解析层，下游影响 `/api/*`、`/mcp`、AI 对话工具循环、任务台账、用户存储与会话存储。
- **整体成功判据**：
  1. 任何写操作都必须经过服务端能力门禁，不能只靠 UI 隐藏；
  2. 本机管理员、远程管理员、editor、viewer、Token 的身份边界不互相旁路；
  3. 数据源/删除类操作对 editor 与 viewer 严格禁止；
  4. 既有 Bearer Token、`scope readonly`、chat/task 契约不被破坏；
  5. 任务操作者、聊天 owner 等新增数据能从创建贯通到展示；
  6. 会话/角色/禁用变更能即时生效，不能出现“已禁用仍可用”。

### 1.2 角色清单

| # | 角色 | 类型 | 权限层级 | 职责 | 来源 |
|---|---|---|---|---|---|
| 1 | 本机管理员 | 用户 | 管理员 | 源地址 + Host 双回环，免登录全权 | DESIGN §3.1 |
| 2 | 远程管理员 | 用户 | 管理员 | 登录后全权，管理账号 | requirement R5 |
| 3 | 读写账号 editor | 用户 | 已登录 | 写知识；数据源只读；无运维/账号权限 | requirement R5 |
| 4 | 只读账号 viewer | 用户 | 已登录 | 只读 + 聊天（工具只读） | requirement R5 |
| 5 | 未登录远程访客 | 用户 | 未登录 | 登录引导；不得读取业务数据 | S02 |
| 6 | MCP Token 客户端 | 自动化 | Token | Bearer + scope，既有行为不变 | S03 |
| 7 | 本机 CLI | 自动化 | 本机 | `ki user` / 导入 / 任务创建 | S01/S05 |
| 8 | 定时任务 | 自动化 | 系统 | 定时同步，无用户上下文 | S05 |
| 9 | 反向代理 / 恶意网页 | 环境/攻击者 | — | 伪造 Host/Origin/XFF，尝试 CSRF/DNS rebinding | S06 |
| 10 | 旧数据 | 环境 | — | 旧任务无 operator、旧会话无 owner、旧 Token | S03/S05 |

## 2. 推演矩阵 + 启用策略 profile

### 2.1 策略 profile

- ✅ 新增功能类（feature）
- ✅ CRUD/接口类（crud-api）
- ✅ 并发/竞态敏感类（concurrency）
- ✅ 重构/迁移类（refactor-migration）
- ✅ 批处理/同步类（batch-sync）
- ➖ 未启用：实时/推送、事务状态机（无对应强信号）

### 2.2 角色 × 场景矩阵

| 场景 \ 角色 | 本机管理员 | 远程管理员 | editor | viewer | Token | CLI/定时 | 攻击者/旧数据 |
|---|---|---|---|---|---|---|---|
| S1 启动与首次登录 | ✅ | ✅ | - | - | ✅ | ✅ | - |
| S2 本机/代理边界 | ✅ | - | - | - | - | - | ✅ |
| S3 管理员用户管理 | ✅ | ✅ | - | - | - | ✅ | ✅ |
| S4 editor 写与数据源只读 | - | - | ✅ | - | - | - | - |
| S5 viewer 只读与任务脱敏 | - | - | - | ✅ | - | - | ✅ |
| S6 Token 兼容 | - | - | - | - | ✅ | - | - |
| S7 任务操作者 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| S8 会话/聊天/安全/并发 | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |

## 3. 场景推演详情

### S1 启动与首次登录

**执行者**：本机管理员、远程管理员、CLI、Token
**场景描述**：无账号、仅有账号、仅有 Token、users.json 损坏四种启动状态；首次登录。

```text
{非回环启动}
  ├─ users.json 缺失 + 无 Token
  │    └─ ❌ 拒绝启动 MCP_HTTP_TOKEN_REQUIRED（符合预期，但需给出两条出路）
  ├─ 仅账号（enabledUserCount>0）
  │    └─ ✅ 允许启动；MCP 客户端仍无 Token 会 401（需在提示中说明）
  ├─ 仅 Token
  │    └─ ✅ 允许启动；Web 远程登录提示“尚未创建账号”
  └─ users.json 损坏
       └─ ⚠️ 设计要求 fail-loud USER_STORE_CORRUPT；若实现成 userCount=0 会误报
{本机访问 127.0.0.1 + Host 回环}
  └─ ✅ local-admin，无需登录
{远程访问}
  └─ ✅ 401 → 登录页 → session → 回原页
```

**数据走向**：users.json → principal → capabilities → `/api/auth/me` → 前端 AuthProvider。✅ 贯通。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 启动守卫「Token 或未禁用账号」 | ✅ | 需保证损坏文件不被当成“无账号” |
| 本机管理员免登录 | ✅ | 依赖 Host/XFF 判定（S2） |
| 首次无账号的远程登录 | ✅ | 需明确引导 `ki user create` |
| 会话建立与回跳 | ✅ | Cookie 同源、HttpOnly |

**意外场景**：daemon 先以回环启动、随后改为非回环重启 → 会话丢失，前端 401 跳登录；✅ 可恢复。

**结论**：启动与首次登录主链路成立；**损坏文件与“有账号但全被禁用”的提示**是薄弱点（见 P6）。

### S2 本机 / 反向代理边界

**执行者**：本机管理员、攻击者、反向代理
**场景描述**：验证 local-admin 不被 Host/XFF/代理误判。

```text
{127.0.0.1 + Host 127.0.0.1}
  └─ ✅ local-admin
{localhost + Host localhost}
  └─ ✅ local-admin
{Host evil.com + 源地址回环}
  └─ ✅ 不判 local-admin → 401/登录
{X-Forwarded-For 存在 + 回环源}
  └─ ✅ 不判 local-admin
{SSH 隧道：源地址 127.0.0.1 + Host localhost + 无 XFF}
  └─ ⚠️ 判为 local-admin（已知边界；文档要求对外部署关闭本机免登录）
```

**数据走向**：请求 → clientAddr + Host + XFF → principal。✅ 判定链清晰。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 源地址 + Host 双判定 | ✅ | — |
| XFF 出现即不判本机 | ✅ | 但本地代理也会让本机用户失去免登录，需文档说明 |
| `--no-local-admin` 关闭 | ✅ | 登录页需根据 `localAdminEnabled` 隐藏提示（已在 S04 补） |
| SSH 隧道 | ⚠️ | 已知边界：远程经隧道会成为管理员；需部署文档强提示 |

**意外场景**：恶意网页 DNS rebinding 发送 `Host: evil.com` → 不判本机；无 session → 401；✅。
**结论**：判定链自洽；SSH 隧道是用户已接受的便利性边界，但必须在部署文档中高亮。

### S3 管理员用户管理

**执行者**：远程管理员、CLI、旧数据
**场景描述**：创建 editor/viewer、改角色、禁用/启用、删除、最后管理员保护、并发操作。

```text
{创建 editor/viewer}
  └─ ✅ 角色枚举 + scrypt 密码 + users.json 0600
{改角色 admin→editor}
  └─ ✅ 下一次请求按新能力执行（会话保留）
{禁用 editor}
  └─ ✅ 登录拒绝；旧会话应 401（依赖 users 读取新鲜度）
{删除 editor}
  └─ ✅ 会话失效；历史任务 operator 仍显示快照
{降级/禁用/删除最后一个 admin}
  └─ ✅ 409 USER_LAST_ADMIN（store 层统一保护）
{两个 admin 并发互降}
  └─ ✅ 锁串行；第二个操作看到只剩一个 admin → 409
{CLI 创建用户同时 daemon 正在鉴权}
  └─ ⚠️ 若 daemon 只按 mtime+size 缓存，可能短暂读到旧角色/禁用态
```

**数据走向**：CLI/API → users.json → daemon 读取 → principal。✅ 主链路通。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 角色枚举与唯一用户名 | ✅ | — |
| 最后管理员保护（删除/降级/禁用） | ✅ | 并发下依赖文件锁；需同一锁内“读-判-写” |
| 用户变更即时生效 | ⚠️ | mtime+size 缓存可能漏掉同秒/同大小变更 |
| 删除/禁用后会话失效 | ✅ | 依赖每次请求重读用户 |
| CLI 与 daemon 并发写 | ✅ | 原子写 + 锁；需处理陈旧锁 |

**意外场景**：最后一个 admin 被禁用后，非回环启动 `enabledUserCount=0` → 拒绝启动；用户可在本机 `ki user enable` 恢复，但错误提示需给出这条路（P6）。

**结论**：主流程成立；**用户存储缓存的新鲜度**是安全薄弱点（P1），并发锁需保证“读-判-写”原子。

### S4 editor 知识写与数据源只读

**执行者**：editor
**场景描述**：editor 正常写知识；尝试数据源写/删、运维、账号管理。

```text
{editor 登录}
  └─ ✅ capabilities = knowledge.read/write + chat.use/writeTools + datasource.read + tasks.read
{上传导入 / 知识写入 / 文档编辑}
  └─ ✅ 能力通过；仍受 scope readonly 约束
{AI 对话写工具}
  └─ ✅ 工具注册表过滤后保留写工具
{数据源页列表/详情}
  └─ ✅ GET datasource.read 放行；页面操作按钮不渲染
{添加 Git / 同步 / 编辑 / 定时}
  └─ ✅ 403 DATA_SOURCE_FORBIDDEN
{移除登记 / 删除待删文档 / import prune}
  └─ ✅ 403 DATA_SOURCE_FORBIDDEN
{restore / vector optimize / scope delete / users}
  └─ ✅ 403 OPS_FORBIDDEN / USER_FORBIDDEN
{任务取消 / 任务删除}
  └─ ✅ 403 tasks.cancel / tasks.delete
```

**数据走向**：principal → capabilities → 路由/工具注册表 → handler。✅ 全链路。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 数据源 GET 只读 / 写删禁止 | ✅ | — |
| 删除三个入口（remove/prune/import prune） | ✅ | 需保证路由表逐项登记 |
| 运维写 admin-only | ✅ | — |
| 任务取消/删除 admin-only | ✅ | 任务详情无删除入口 |
| editor 可删知识 | ✅（已接受） | `knowledge.write` 含删除，需在 UI/文档说清 |

**意外场景**：editor 直接构造 `/api/datasource/prune` 或 `/api/import/prune` → 403；✅。
**结论**：editor 的能力边界在文档层面自洽；实现时路由覆盖率测试是关键。

### S5 viewer 只读与任务脱敏

**执行者**：viewer、旧数据
**场景描述**：viewer 浏览/检索/聊天；构造写请求；查看任务详情与操作者。

```text
{viewer 登录}
  └─ ✅ capabilities = knowledge.read + chat.use + tasks.read
{浏览 / 检索 / 查看文档}
  └─ ✅
{上传 / 写入 / 编辑 / 数据源 / 用户管理}
  └─ ✅ 导航隐藏 + 接口 403 USER_READONLY / DATA_SOURCE_FORBIDDEN
{AI 对话}
  └─ ✅ 可聊天；工具列表只剩 5 个读工具
{任务列表 / 详情 / 操作者}
  └─ ✅ tasks.read；操作者三类可见
{任务详情的数据源参数}
  └─ ✅ 设计要求脱敏 source/remoteUrl/subdir；需确认接口视图实现
{旧会话无 owner}
  └─ ⚠️ 仅 admin 可见；viewer 打开会话列表为空，需要 UI 解释
```

**数据走向**：task params → 脱敏视图 → 前端；conversation.ownerUserId → 列表/详情。✅ 设计已交代。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| viewer 写接口全拒绝 | ✅ | — |
| 聊天工具只读 | ✅ | — |
| 任务详情数据源参数脱敏 | ✅（设计） | 需服务端视图层实现，不能只在 UI 隐藏 |
| 操作者可见 | ✅ | 用户已确认 |
| 旧会话可见性 | ⚠️ | 旧会话仅 admin，editor/viewer 空列表需要说明 |

**意外场景**：viewer 直接调 `/api/tasks/:id` 读取参数 → 若接口返回原始 TaskRecord，会泄露数据源；设计要求脱敏，需在路由层落实（见 P4）。
**结论**：只读边界成立；任务详情脱敏与旧会话空态是体验/实现风险。

### S6 Token 兼容

**执行者**：MCP Token 客户端
**场景描述**：Bearer 访问 `/mcp` 与 `/api`；readOnly；与 Cookie 并存。

```text
{Bearer 有效}
  └─ ✅ token principal；scope 校验
{Bearer + Cookie 同时存在}
  └─ ✅ Bearer 优先
{Token 访问 /api/users}
  └─ ✅ 403（TOKEN_CAPABILITIES 不含 users.manage）
{Token 访问 /api/datasource/remove}
  └─ ✅ 原行为保留（datasource.delete 在 Token 能力内）
{readOnly Token 访问 /mcp}
  └─ ✅ 只注册 5 个读工具
{readOnly Token 访问 /api/import/run}
  └─ ⚠️ 仍可写（Token readOnly 只作用于 /mcp，既有边界）
```

**数据走向**：Token → scopes + readOnly → capabilities → 路由/工具。✅ 兼容。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| Token 不获得新管理能力 | ✅ | `users.manage` / `tasks.delete` 已排除 |
| Token readOnly 仍只约束 `/mcp` | ⚠️ | 既有边界；需在文档/UI 说明 |
| Bearer 优先 Cookie | ✅ | — |

**结论**：Token 兼容成立；readOnly 的跨通道不一致是已接受边界，不应被误读为新功能缺陷。

### S7 任务操作者

**执行者**：admin、editor、viewer、CLI、定时任务、Token、旧任务
**场景描述**：各类任务创建、展示、重试、旧任务。

```text
{Web admin 触发导入/同步}
  └─ ✅ operator = {type:user,label:admin}
{Web editor / viewer 触发允许的任务}
  └─ ✅ operator = 对应用户名
{CLI / daemon RPC}
  └─ ✅ operator = 本机 CLI
{定时同步}
  └─ ✅ operator = 定时同步
{Token 触发的 Web 任务}
  └─ ✅ operator = Token 短 ID
{旧任务}
  └─ ✅ operator 缺失 → 显示 —
{重试}
  └─ ✅ 使用当前操作者，不继承原任务
{任务详情 viewer}
  └─ ✅ 操作者可见；数据源参数脱敏
```

**数据走向**：principal → operator 快照 → task JSON → API → 列表/详情/CLI。✅ 贯通。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 10 个创建点全部传 operator | ✅ | 需测试兜底：缺 operator 新任务应报错 |
| operator 不可变 | ✅ | TaskPatch 白名单排除 |
| 旧任务兼容 | ✅ | `—`，不回填 |
| 重试操作者 | ✅ | 当前 principal |
| 列表/详情/CLI 展示 | ✅ | 列宽/窄屏需实测 |

**结论**：任务操作者设计成立；实现重点是 10 个创建点无遗漏。

### S8 会话、聊天归属、安全与并发

**执行者**：所有用户、攻击者、旧数据
**场景描述**：登录/登出/过期/改密/禁用/角色变更；聊天 owner；CSRF；限速；未知路由。

```text
{登录 → 会话 → 刷新}
  └─ ✅ HttpOnly Cookie；刷新保持
{改密}
  └─ ✅ 其他会话 401；当前会话轮换
{删除/禁用用户}
  └─ ✅ 旧会话应 401（依赖用户读取新鲜度）
{角色变更}
  └─ ✅ 下一次请求按新能力执行
{聊天 owner}
  ├─ admin：全部
  ├─ editor/viewer：只看/改自己的
  └─ legacy：仅 admin
{跨站 text/plain 写请求}
  └─ ✅ 403/415；SameSite=Strict
{Host evil.com + 回环源}
  └─ ✅ 不判 local-admin
{登录失败 5 次}
  └─ ✅ 429；但 Map 无上限/定时清理 → ⚠️
{请求不存在的 /api 路径}
  └─ ⚠️ 默认拒绝可能返回 403 而非 404
```

**数据走向**：用户记录 → 会话 → principal → 能力；conversation.ownerUserId → 所有子路由。✅ 设计已交代。
**关键设计点**：

| 设计点 | 验证结果 | 问题 |
|---|---|---|
| 会话失效（改密/删除/禁用/角色） | ✅ | 依赖用户读取新鲜度（P1） |
| 聊天 owner 全子路由 | ✅ | 需 `resolveConversationInScopes` 统一校验 |
| CSRF（Origin + SameSite + JSON） | ✅ | Origin 只比较 host+port |
| 登录限速 | ⚠️ | Map 无上限；用户名可被随机填充 |
| 未知路由 403/404 | ⚠️ | 需区分“已知但未登记”与“完全不存在” |

**结论**：安全主链路成立；**用户缓存新鲜度、限速 Map 上限、未知路由语义**是剩余风险。

## 4. 问题汇总

| # | 类型 | 角色 | 场景 | 问题描述 | 功能影响（预期 → 实际） | 建议 | 严重度 |
|---|---|---|---|---|---|---|---|
| P1 | 数据问题/安全 | 管理员 → 被禁用用户 | S3/S8 | users.json 以 mtime+size 缓存失效；同秒同大小变更可能不被发现 | 预期：禁用/改角色立即生效 → 实际：极端情况下旧权限继续可用 | 鉴权每次读小文件，或引入 content hash/revision；不要只靠 mtime+size | ⚠️ 疑似阻断（中置信度） |
| P2 | 安全 | 未登录攻击者 | S8 | 用户不存在与密码错误的耗时可能不同（scrypt 只对已存在用户执行） | 预期：无法枚举账号 → 实际：可通过响应时间区分 | 用户不存在时也执行一次 dummy scrypt，统一耗时 | 🟡 |
| P3 | 安全 | 未登录攻击者 | S8 | 登录限速 Map 无上限/无定期清理，随机用户名可增长内存 | 预期：限速不成为 DoS 面 → 实际：可被填充大量 key | 设置 Map 上限 + 定期清理 + 单 IP 上限 | 🟡 |
| P4 | 体验/实现 | 所有登录用户 | S8 | 前端 401 统一拦截只写了原则；`/mcp` 与 chat SSE 的 401 未明确接入 | 预期：会话过期跳登录 → 实际：MCP/聊天可能只显示工具错误 | 在 `httpApi.req` 与 mcpClient/SSE 层统一触发 `auth:unauthorized` | 🟡 |
| P5 | 接口语义 | 外部客户端 | S8 | 未登记 `/api` 路由默认 403；完全不存在路径也可能 403 | 预期：不存在 → 404 → 实际：403，误导排查 | 区分“已知但未登记”（403+告警）与“未知路径”（404） | 🟡 |
| P6 | 体验 | 管理员/运维 | S1/S3 | 全部账号被禁用时启动报 `MCP_HTTP_TOKEN_REQUIRED`，未提示 `ki user enable` | 预期：给出可直接执行的恢复命令 → 实际：误以为必须建 Token | 启动错误按 `损坏/全禁用/无账号/无 Token` 分别给命令 | 🟡 |
| P7 | 迁移/体验 | editor/viewer | S5/S8 | 旧会话无 owner，仅 admin 可见；非管理员打开会话列表为空 | 预期：能理解“旧会话归管理员” → 实际：以为数据丢失 | 会话空态增加说明；管理端提供 owner 迁移/清理入口 | 🟡 |
| P8 | 安全边界 | 远程用户 | S2 | SSH 隧道/本地代理使源地址回环；无 XFF 时会被判 local-admin | 预期：远程用户需登录 → 实际：经隧道直接成为管理员 | 部署文档高亮；对外部署强制 `--no-local-admin`；代理必须设 XFF | 🟡（已知边界） |
| P9 | 安全边界 | Token 客户端 | S6 | readOnly Token 仍可通过 `/api` 写（既有行为） | 预期：只读 Token 全通道只读 → 实际：`/api` 可写 | 本期不变；文档明确；后续可统一 | 🟡（既有边界） |
| P10 | 产品边界 | editor | S4/S5 | `knowledge.write` 含知识删除，editor 可删关系/Group（含聊天写工具） | 预期：读写账号可写知识 → 实际：也能删知识 | 用户已接受；若不可接受，拆 `knowledge.delete` 并设 admin-only | 🟡（待确认） |
| P11 | 体验 | 未登录/被禁用 | S1/S8 | 登录页/会话过期文案未区分“账号被禁用”与“密码错误” | 预期：安全上不枚举账号 → 实际：统一文案是对的，但用户无法自救 | 统一对外文案；管理员侧提供账号状态；不向登录者泄露禁用状态 | 🟢 |

统计：🔴 阻断 0（1 项中置信度疑似阻断 P1）；🟡 警告 10；🟢 建议 1。

## 5. 推演结论

### 整体评估

- 推演覆盖：8 个场景 / 10 类角色（含攻击者与旧数据）
- 问题发现：🔴 0 / ⚠️ 疑似阻断 1（P1）/ 🟡 10 / 🟢 1
- 全局回扣：
  - ✅ 权限边界（admin/editor/viewer/Token）在文档层面自洽；
  - ✅ 数据源与删除边界覆盖到接口层；
  - ✅ 任务 operator、聊天 owner 的创建-展示链路有设计交代；
  - ⚠️ 用户存储缓存新鲜度（P1）是全局成功判据“禁用即时生效”的唯一实质风险；
  - ⚠️ SSH 隧道、Token readOnly、知识删除是已接受边界，需在交付文档中明示。

### 评审结论

**⚠️ 有条件通过（需人工确认 P1）**

> 结论为**推演通过（未实际执行）**：基于设计文档推理，非执行性证据。P1 需要在实现前定案；其他 🟡 建议在实施计划中一并处理。

### 下一步建议

1. **先定 P1**：鉴权路径是否每次重读 users.json（推荐）或引入 content hash/revision；这是“禁用立即生效”的前提。
2. 将 P2/P3/P4/P5/P6/P7 纳入实施计划的验收项（安全/体验/接口语义）。
3. P8/P9/P10 写入部署与使用文档的「已知边界」。
4. 需要执行性证据时，下一步走 `demo-verify` 或 `e2e-testing`；本推演不替代真实运行。
5. 修复后可做增量推演，只重推 P1~P7 关联场景。

---

## 6. 增量推演：P1 修复复核（2026-11-03）

**修复**：S-01 §3.2 / S-02 §3.1 改为**每次鉴权重读 `users.json`**，移除 mtime + size 缓存；CLI 仍原子写 + 锁。

**重推场景**：

| 场景 | 预期 | 推演结果 |
|---|---|---|
| 管理员禁用 editor，editor 下一次请求 | 401，不能继续使用 | ✅ 通过（每次请求重读用户） |
| 管理员把 editor 改为 viewer，下一次请求 | 写接口 403 | ✅ 通过（capabilities 重算） |
| CLI 创建/改密后 daemon 立即鉴权 | 能登录 / 旧会话失效 | ✅ 通过（原子写 + 重读） |
| CLI 写与 daemon 读并发 | 读到旧或新完整文件，不出现半截 | ✅ 通过（临时文件 + rename） |
| users.json 损坏 | 登录 503 `USER_STORE_CORRUPT`，不静默当无账号 | ✅ 通过 |

**结论**：P1 关闭，不再作为疑似阻断。剩余 P2~P10 维持原判；本次仍为推演结论，未实际执行。

---

## 7. 增量推演：P2~P7 修复复核（2026-11-03）

**修复摘要**：

| # | 修复 | 落点 |
|---|---|---|
| P2 | 用户不存在也执行 dummy scrypt，统一失败耗时 | S-02 §3.6 |
| P3 | 限速 Map 上限 10k / 单 IP 100 key / 过期清理 | S-02 §3.6 |
| P4 | `authEvents.notifyUnauthorized()` 覆盖 API / MCP / SSE，只跳一次登录 | S-04 §3.1 |
| P5 | `matchRoute` 四态；未知路径 404，已知未登记 403 + 告警 | S-03 §3.5 |
| P6 | 启动按损坏/无凭据/全禁用/仅 Token/仅账号分别提示 | S-02 §3.7、S-06 §3.4 |
| P7 | editor/viewer 旧会话空态说明；admin「未归属」徽标 | S-04 §3.6 |

**重推场景**：

| 场景 | 预期 | 推演结果 |
|---|---|---|
| 连续用不同不存在用户名登录 | 每次耗时接近，无法枚举 | ✅ 通过（dummy scrypt） |
| 随机用户名灌入限速 Map | Map 有界，不无限增长 | ✅ 通过（上限 + 清理） |
| 会话过期后调用 API / MCP / SSE | 三通道都只跳一次登录页 | ✅ 通过（统一事件） |
| 请求不存在的 `/api/nope` | 404 | ✅ 通过（四态匹配） |
| 新路由已存在但漏登记 | 403 + 覆盖率测试失败 | ✅ 通过（known-unregistered） |
| 非回环启动 + 账号全部禁用 | 明确提示 `ki user enable` | ✅ 通过（专用错误码） |
| editor/viewer 打开空会话列表 | 说明历史会话仅管理员可见 | ✅ 通过（空态文案） |
| admin 查看旧会话 | 显示「未归属」徽标 | ✅ 通过 |

**结论**：P2~P7 关闭；剩余 P8（SSH 隧道）、P9（readOnly Token 仍可写 `/api`）、P10（editor 可删知识）为已接受的 v1 边界，不再作为新问题。整体推演结论：**✅ 通过（未实际执行）**。

**下一步**：执行性验证走 `demo-verify` / `e2e-testing`；或进入 `api-design` / `test-planner` / `plan-track`。
