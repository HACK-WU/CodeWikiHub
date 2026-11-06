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

# S-01 账号模型与 CLI

> 父设计：[DESIGN.md](./DESIGN.md)
> 关联需求：[requirement.md](../requirement.md)

## 1. 术语

| 术语 | 含义 |
|---|---|
| 账号 `UserRecord` | 可登录 Web 页面的身份；与 MCP Token 独立 |
| 角色 `Role` | `admin` / `editor` / `viewer`，角色只映射到能力集合 |
| 用户存储 `users.json` | `~/.ki/users.json`，0600，原子写 |
| 本机 CLI | 直接执行 `ki user ...` 的本地可信入口 |
| scrypt | Node 内置密码哈希，替代明文/可逆存储 |

## 2. 现状（AS-IS）

- 仓库内没有登录、密码、会话、Cookie 实现；现有凭据只有 MCP Token（`~/.ki/mcp-tokens.json`，0600，明文 Token，`src/lib/mcp-token.ts:24-27`）。
- CLI 命令表在 `bin/ki.mjs:22-44`；新增命令必须同时改命令表、帮助与 `docs/cli.md`。
- 配置/数据目录默认在 `~/.ki`（`src/lib/config.ts`）；Token 存储已确立「0600 + 原子写 + 损坏 fail-loud」的既有范式。
- 现有 Web 没有任何「操作者」概念，任务台账只有 `source`（`src/lib/task-registry.ts:133-155`）。

## 3. 方案（TO-BE）

### 3.1 数据模型

```ts
export type Role = 'admin' | 'editor' | 'viewer';

export interface UserRecord {
  id: string;                 // 8 位短 ID，字母表去易混淆字符
  username: string;           // 展示名，1-64 字符
  usernameLower: string;      // 唯一键，大小写不敏感
  passwordHash: string;       // scrypt$N$r$p$saltB64$hashB64
  role: Role;
  disabled?: boolean;          // v1 支持：禁用即拒绝登录，现有会话失效
  createdAt: string;           // ISO 8601
  updatedAt: string;
  passwordUpdatedAt: string;
  lastLoginAt?: string;
}

export interface UserStoreFile {
  version: 1;
  users: UserRecord[];
}
```

约束：

- `username` 仅允许字母、数字、`-`、`_`、`.`，1-64 字符；大小写不敏感唯一。
- `role` 只接受三个枚举值；非法值按 `USER_STORE_CORRUPT` 处理，不静默降级。
- 密码最少 8 字符、最多 128 字符；不强制复杂度，不记录明文。

### 3.2 存储、并发与损坏处理

- 路径：`~/.ki/users.json`；目录 0700，文件 0600。
- 写入：临时文件 + `rename` 原子替换；同目录锁 `users.json.lock`，5s 超时、失败 fail-loud。
- 读取：**daemon 每次鉴权重读 `users.json`**（文件小、鉴权频率低），不依赖 mtime + size 缓存；CLI 直接写文件，**创建/改密/改角色/禁用后无需重启 daemon，下一次请求立即生效**。若未来确需缓存，必须使用内容 hash 或单调 revision，禁止只用 mtime + size。
- 损坏：JSON 不可解析、schema 不合法 → `USER_STORE_CORRUPT`；登录返回 503，`ki user list` 明确报错；**禁止自动覆盖损坏文件**。
- 空文件/文件不存在：视为「尚无账号」，本机管理员仍可登录；远程登录提示先在本机创建账号。

### 3.3 密码哈希

- `crypto.scrypt`：`N=16384, r=8, p=1, keylen=64`，盐 16 字节随机。
- 存储格式：`scrypt$16384$8$1$<saltBase64>$<hashBase64>`；校验用 `crypto.timingSafeEqual`。
- 改密时更新 `passwordUpdatedAt`，并使该用户所有会话失效（见 S-02）。

### 3.4 CLI 接口

命令统一走 `src/user.ts`，在 `bin/ki.mjs` 注册 `user`：

```bash
ki user create <username> --role <admin|editor|viewer> [--password-stdin]
ki user list [--json]
ki user reset-password <username> [--password-stdin]
ki user set-role <username> --role <admin|editor|viewer>
ki user disable <username>
ki user enable <username>
ki user delete <username> --yes
```

- `create` / `reset-password`：TTY 下隐藏输入并二次确认；非交互用 `--password-stdin` 从 stdin 读一行；**不接受 `--password <明文>`**，避免进程列表/历史泄露。
- `create` **必须显式指定 `--role`**，不默认 admin（防止误建管理员）。
- `delete` / `set-role` / `disable`：若会使系统失去最后一个**未禁用**的 admin，拒绝并返回 `USER_LAST_ADMIN`。三个入口共用同一个 store 层保护，不允许只在 CLI 或只在 API 做。
- `list` 不回显密码哈希，展示 `disabled` 状态。

Demo 输出：

```json
{
  "ok": true,
  "user": { "id": "a7Kp2mQx", "username": "admin", "role": "admin", "disabled": false }
}
```

### 3.5 错误码

| 错误码 | 场景 | HTTP/CLI 行为 |
|---|---|---|
| `USER_EXISTS` | 用户名已存在（大小写不敏感） | CLI 非 0；API 409 |
| `USER_NOT_FOUND` | 账号不存在 | CLI 非 0；API 404 |
| `USER_INVALID_ROLE` | 角色不在枚举内 | CLI 非 0；API 400 |
| `USER_PASSWORD_TOO_WEAK` | 密码 < 8 或 > 128 | CLI 非 0；API 400 |
| `USER_PASSWORD_REQUIRED` | 未提供密码 | CLI 非 0；API 400 |
| `USER_LAST_ADMIN` | 删除/降级最后一个 admin | CLI 非 0；API 409 |
| `USER_STORE_CORRUPT` | 文件损坏/schema 非法 | CLI 非 0；登录 503 |

### 3.6 关键决策

| 决策 | 采用 | 被否决方案 | 否决理由 |
|---|---|---|---|
| 存储位置 | 独立 `~/.ki/users.json` | 写入 `config.yaml` | 密码哈希不应进配置文件；配置热加载会扩大泄露面 |
| 密码算法 | Node 内置 scrypt | 引入 argon2/bcrypt | 不增加原生依赖，跨平台安装成本最低 |
| CLI 写入方式 | 直接写文件 + 锁 | 走 daemon RPC | daemon 未运行时也必须能创建/救援账号 |
| 创建默认角色 | 必须显式 `--role` | 默认 admin | 一次误操作就产生全权账号 |
| 用户读取 | 每次鉴权重读 `users.json` | mtime+size 缓存 | 同秒同大小变更可能漏失效，禁用/改角色不生效 |

### 3.7 影响范围

| 文件 | 变更 |
|---|---|
| `src/lib/user-store.ts` | 新增：读写、校验、哈希、CRUD、最后管理员保护 |
| `src/user.ts` | 新增：CLI 子命令 |
| `bin/ki.mjs` | 命令表 + 帮助 + 示例 |
| `docs/cli.md` | `## user` 章节 |
| `test/user-store.test.ts` / `test/user-cli.test.ts` | 新增 |

### 3.8 验收标准

- `~/.ki/users.json` 为 0600；文件中无明文密码；损坏时登录 503、`ki user list` 报错。
- `ki user create alice --role editor` 后，无需重启 daemon 即可登录。
- 同名大小写变体创建失败；删除/降级最后一个 admin 失败。
- 密码不出现在 argv、环境变量、日志、进程列表。
