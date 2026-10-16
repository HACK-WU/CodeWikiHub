# xpert-cloud 前端接口索引

> 根目录：`/root/xpert` · slug：`xpert-cloud` · 范围：`apps/cloud/src/**`（Angular 17）
> 生成：2026-10-16 @ commit `80f5676fd` · 页面 **81** · 接口 **205** · **快照制，需一键重建**

## 怎么用

1. **改接口前**查「接口 → 页面」定位影响面（`apis/*.md`；只把「直接调用页面」当影响面，间接候选仅参考）
2. **接页面任务**查「页面 → 接口」拿到要读的文件与依赖（`pages/*.md`）
3. 表是快照：`--check` 报过期时重跑脚本再标注

## 高频直达

| 我要… | 去哪一页 | 接口 |
|---|---|---|
| 改 `⟨user⟩/:param`（影响 9 个直接调用页面） | [apis/admin.md](./apis/admin.md) | `DELETE ⟨user⟩/:param` |
| 改 `⟨user⟩/me`（影响 8 个直接调用页面） | [apis/admin.md](./apis/admin.md) | `GET ⟨user⟩/me` |
| 改 `/api/xpert-project/:param/access`（影响 7 个直接调用页面） | [apis/project.md](./apis/project.md) | `GET /api/xpert-project/:param/access` |
| 改 `/api/xpert-project/:param`（影响 7 个直接调用页面） | [apis/project.md](./apis/project.md) | `GET /api/xpert-project/:param` |
| 改 `/api/user-organization/:param`（影响 7 个直接调用页面） | [apis/admin.md](./apis/admin.md) | `PUT /api/user-organization/:param` |
| 改 `/api/agent-evolution/targets/synchronize`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/targets/synchronize` |
| 改 `/api/agent-evolution/targets`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `GET /api/agent-evolution/targets` |
| 改 `/api/agent-evolution/releases/:param/shadow`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/releases/:param/shadow` |
| 改 `/api/agent-evolution/releases/:param/rollback`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/releases/:param/rollback` |
| 改 `/api/agent-evolution/releases/:param/pause`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/releases/:param/pause` |
| 改 `/api/agent-evolution/releases/:param/install`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/releases/:param/install` |
| 改 `/api/agent-evolution/releases/:param/canary`（影响 7 个直接调用页面） | [apis/agent-evolution.md](./apis/agent-evolution.md) | `POST /api/agent-evolution/releases/:param/canary` |

## 分区索引

| 分区 | 页面表 | 接口表 | 页面数 | 接口数 |
|---|---|---|---|---|
| 租户·用户·组织管理（/tenant/**、/users/**、/organization/**） | [pages/admin.md](./pages/admin.md) | [apis/admin.md](./apis/admin.md) | 9 | 21 |
| Agent 演进（/agent-evolution/**） | [pages/agent-evolution.md](./pages/agent-evolution.md) | [apis/agent-evolution.md](./apis/agent-evolution.md) | 7 | 26 |
| 准入与引导（/auth/**、/onboarding/**） | [pages/auth.md](./pages/auth.md) | [apis/auth.md](./apis/auth.md) | 7 | 35 |
| 对话域（/chat/**） | [pages/chat.md](./pages/chat.md) | [apis/chat.md](./apis/chat.md) | 5 | 4 |
| 公共与杂项（/、/404、/explore、/plugins 等） | [pages/common.md](./pages/common.md) | [apis/common.md](./apis/common.md) | 15 | 0 |
| Agent 执行与任务 | [pages/execution.md](./pages/execution.md) | [apis/execution.md](./apis/execution.md) | 0 | 4 |
| 知识与文档 | [pages/knowledge.md](./pages/knowledge.md) | [apis/knowledge.md](./apis/knowledge.md) | 0 | 1 |
| 模型·会员·计费 | [pages/model.md](./pages/model.md) | [apis/model.md](./apis/model.md) | 0 | 34 |
| 其他与公共 | [pages/other.md](./pages/other.md) | [apis/other.md](./apis/other.md) | 0 | 32 |
| 插件与技能 | [pages/plugin.md](./pages/plugin.md) | [apis/plugin.md](./apis/plugin.md) | 0 | 9 |
| 项目协作（/project/**） | [pages/project.md](./pages/project.md) | [apis/project.md](./apis/project.md) | 8 | 21 |
| 公共助手页与 ChatKit（/x/**、/x-chatkit/**） | [pages/public-assistant.md](./pages/public-assistant.md) | [apis/public-assistant.md](./apis/public-assistant.md) | 3 | 0 |
| 设置域（/settings/**） | [pages/settings.md](./pages/settings.md) | [apis/settings.md](./apis/settings.md) | 20 | 0 |
| 助手管理与工作区（/xpert/**、/w/**） | [pages/xpert-area.md](./pages/xpert-area.md) | [apis/xpert-area.md](./apis/xpert-area.md) | 7 | 18 |

## 口径与已知局限

- 接口 URL 中的 `${...}` 已归一为 `⟨base⟩`：**前缀来自实例配置**（如 `XpertAPIService.apiBaseUrl` / `API_URL`），非运行时不可静态求值
- 置信度：🟢 页面自身调用（深度 0）· 🟡 直接依赖（深度 1）· 🔵 间接候选（深度 ≥2）；反向表的「间接候选」列只给条数
- 扫描期另有 **5** 条 URL 为残缺模板（如 `${...`/裸 `⟨base⟩`），已剔除不列表——需回源码确认（属 `[待确认]`）
- 未提取：GraphQL / WebSocket / RPC（socket.io 与协作 WS 不在本索引）；扫描期 `pending` 500 条多为**惰性加载边界**（模块级路由条目，其子路由各自有映射）
- 跨端 join：本索引的接口路径可与后端索引 `.fe-index/xpert/` 的「模块 → 挂载前缀」对照（改后端接口 → 查本索引受影响页面）

