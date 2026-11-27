---
id: REQ-20261120-003
feature: 知识地图图集
document_type: design
created: 2026-11-24
updated: 2026-11-24
version: 1
author: AI
---

# S-04 图集页面（只读）

> 一期**只读**：能看、能空态引导，**没有上传按钮**（用户拍板：`ki atlas upload` 验证通过后再做页面上传）。

## 1. 术语

| 术语 | 定义 |
|---|---|
| 壳 | 页面外壳（状态栏 + 容器），不含图集逻辑 |
| 三态 | 正常（有包）/ 空态（未上传）/ 错误（越权、损坏、会话过期） |

## 2. 现状（AS-IS）

- 路由表在 `web/src/router/routes.tsx:80-158`（`AppRoutes`），页面需 `RequireAuth` + `RequireCapability`（`:21-43`）。
- 侧栏 `NAV_WORKSPACE`（`web/src/layouts/AppShell.tsx:85-97`）与 `NAV_OPS`（`:100-107`），权限过滤 `canSeeNavItem`（`:293-297`），H1 查表 `currentLabel`（`:469-477`）。
- scope 不走 URL，走 `useScope()`（`web/src/lib/scopeContext.tsx:49-55`）。
- **无任何 iframe 使用先例**（`web/src` 全仓 0 命中），本次是第一个。

## 3. 方案（TO-BE）

### 3.1 布局（已确认）

**正常态**

```
┌──────────────────────────────────────────────────────────────────────┐
│ 知识地图                                        scope: kisearch ▾    │
├──────────┬───────────────────────────────────────────────────────────┤
│ 工作台   │ ① 状态栏                                                  │
│ 仪表盘   │  项目知识地图 · master@1c3dabf · 生成 11-24 · 4 图 · 249KB │
│ 浏览     │  · sha 9bad814a                         [④ 卸载（二期）]   │
│ 搜索     │───────────────────────────────────────────────────────────│
│ 知识写入 │ ② iframe 区（占满剩余高度，内部滚动）                      │
│ 对话     │ ┌───────────────────────────────────────────────────────┐ │
│ 知识地图◀│ │ 知识地图  总览 | 架构总览 | 核心链路 | 服务与测试     │ │
│ 运维     │ │     ┌──────────┐   ┌────────────────────────────┐      │ │
│ 数据源   │ │     │  SVG 图  │──▶│ ③ 代码快照抽屉（图集自带） │      │ │
│ 事件     │ │     └──────────┘   └────────────────────────────┘      │ │
│ 回收站   │ └───────────────────────────────────────────────────────┘ │
└──────────┴───────────────────────────────────────────────────────────┘
```

**空态**

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ 侧栏     │            ┌──────────────────────────────┐                │
│          │            │ ⑤ 这个库还没有知识地图       │                │
│          │            │                              │                │
│          │            │ 1. pack_atlas.py <目录> dist │                │
│          │            │     --zip                    │                │
│          │            │ 2. ki atlas upload --scope   │                │
│          │            │     kisearch --file dist/…   │                │
│          │            │ 3. 上传后刷新本页            │                │
│          │            └──────────────────────────────┘                │
└──────────┴───────────────────────────────────────────────────────────┘
```

**错误态**（三合一容器）

```
⑥ 无权查看 kisearch 的知识地图 · [切换库]
⑦ 图集文件损坏，请重新上传 · [查看步骤]
⑧ 会话已过期 · [重新登录]
```

| 编号 | 元素 | 说明 |
|---|---|---|
| ① | 状态栏 | 恒显基线 commit + 生成时间 + sha 前 8 位 + 体积，**不可省略** |
| ② | iframe | `sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"` + `frame-ancestors 'self'` |
| ③ | 抽屉 | 图集自带，**产品侧零实现**（标注清楚防实施重做） |
| ④ | 卸载 | 一期不做（依赖写接口）；本期不进 DOM |
| ⑤ | 空态三步 | 命令可直接复制；不出现空白 iframe |
| ⑥⑦⑧ | 错误态 | 各带一个可执行出口；**不出现裸 JSON** |

### 3.2 组件与文件

```
web/src/
├── pages/AtlasPage.tsx          # [新增] 壳 + 三态
├── api/httpApi.ts               # [修改] +getAtlasStatus(scope)
├── router/routes.tsx            # [修改] +<Route path="/atlas">
└── layouts/AppShell.tsx         # [修改] NAV_WORKSPACE 增「知识地图」+ H1 表
```

### 3.3 关键实现约束

| # | 约束 | 原因 |
|---|---|---|
| 1 | **先查 status 再建 iframe**，status 失败只渲染错误态 | 验证报告 A3：iframe 直接吃 401/403/404 会显示裸 JSON |
| 2 | iframe `key={scope}` | 切 scope 时强制重载，避免旧图残留 |
| 3 | `sandbox` 四件套 | 缺 `allow-downloads` 会拦「导出 ↓」（验证报告 A4） |
| 4 | 不监听 iframe 内部事件、不注入脚本 | 跨文档不可控，产品侧只做容器 |
| 5 | 状态栏数据只来自 `/api/atlas/status` | 不从 iframe 内抓，避免解析第三方产物 |

### 3.4 接口调用

```ts
// web/src/api/httpApi.ts
export const getAtlasStatus = (scope: string) =>
  getJson<AtlasStatusResponse>(`/api/atlas/status?scope=${encodeURIComponent(scope)}`);
```

**Demo 响应**

```json
{ "ok": true, "exists": true, "title": "kisearch 知识地图", "branch": "master",
  "baseline": "1c3dabf", "size": 254753, "sha256": "9bad814a…", "uploadedAt": "2026-11-24T15:30:12Z" }
```

### 3.5 异常处理

| 场景 | 页面表现 | 是否暴露细节 |
|---|---|---|
| `status` 401 | 整页跳登录（`RequireAuth` 已有） | — |
| `status` 403 | ⑥ 错误态 + 切换库入口 | 显示 scope 名，不显示内部路径 |
| `exists:false` | ⑤ 空态 | — |
| `view` 404/500 | ⑦ 错误态（iframe 已被 status 拦住，正常不触发） | 只显示错误码，不显示文件路径 |
| 网络断开 | 通用「无法连接服务」+ 重试 | 否 |

## 4. 影响范围

| 文件 | 改动 |
|---|---|
| `web/src/pages/AtlasPage.tsx` | 新增 |
| `web/src/router/routes.tsx` | +1 路由（`RequireCapability cap="knowledge.read"`） |
| `web/src/layouts/AppShell.tsx` | +1 侧栏项、+1 H1 标题、`GOVERNANCE_LABELS` 不受影响 |
| `web/src/styles/ki.css` | 复用现有 token，仅加 `.atlas-*` 容器与状态栏 |
| `web/test/*` | 新增页面级静态断言 |

## 5. 待定问题

| # | 问题 | 暂定 |
|---|---|---|
| 1 | 是否在侧栏显示「有图集」徽标 | 不做（避免每次进页面都为各库查 status） |
| 2 | 图集与「浏览」页的关系 | 完全独立，不进文档列表（需求 §2.2 已定） |
