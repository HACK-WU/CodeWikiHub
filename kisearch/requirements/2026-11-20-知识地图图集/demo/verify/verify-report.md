---
id: REQ-20261120-003
feature: 知识地图图集
document_type: demo
created: 2026-11-24
updated: 2026-11-24
author: AI
---

# 验证报告：整包部署 + iframe 加载是否成立

**目的**：在投入开发前，验证需求 v4 的核心形态「图集包上传 → 鉴权接口下发 → iframe 加载」能否真正跑通。
**日期**：2026-11-24 　**原型**：`demo/verify/atlas-iframe/`　**断言**：19 条，**19 通过 / 0 失败**
**说明**：原型只覆盖风险点，不含并发控制、分片续传、WAL、审计与真实部署。

## 1. 风险识别与验证范围

| 编号 | 风险点 | 类型 | 结论 |
|---|---|---|---|
| R-01 | iframe 加载「鉴权 API 返回的自包含 HTML」能否真正运行（脚本、节点、抽屉、导出） | 技术可行性 | ✅ 通过 |
| R-02 | base64 分片上传 → 原子落盘 → 重传覆盖 + archive，坏包拒绝 | 集成可行性 | ✅ 通过（含 1 项调整） |
| R-03 | 1.2 MB 级包在 iframe 内的首屏耗时 | 性能 | ✅ 通过 |
| R-04 | 暗色主题下 iframe 白板的观感与可缓解程度 | 集成/体验 | ⚠️ 有条件通过 |
| R-05 | iframe 不能带 Authorization，只能靠 Cookie 会话 | 集成 | ✅ 通过 |

不验证：图集内容正确性、产品导航集成、真实服务器部署、并发与鉴权全链路。

## 2. 原型构成

```
demo/verify/atlas-iframe/
├── server.mjs          # 模拟 /api/atlas/{status,view,package} + Cookie 会话 + 包校验 + 原子替换
├── public/index.html    # 模拟 /atlas 页面：顶栏状态、浅/暗主题、空态、iframe、上传/卸载
├── make-packages.mjs    # 生成两档包：real 249 KB（真包）/ synth 1266 KB（体积注入近似）
├── probe.mjs           # playwright 19 条断言 + 截图
├── packages/real.html   # project-atlas demo 的烘焙产物（4 页 / 25 节点）
└── shots/               # R01 抽屉 / R03 大包 / R04 暗色 / F1 空态
```

复现：

```bash
cd demo/verify/atlas-iframe && node make-packages.mjs
node server.mjs                                   # http://127.0.0.1:8910/atlas
node probe.mjs                                    # 需本机有 playwright + chromium
```

## 3. 逐项结论

### R-01 iframe 内交互 —— ✅ 通过

| 断言 | 结果 |
|---|---|
| 图集首页渲染（索引页无节点属正常） | 首页文本 935 字，`架构总览` 等分类可见 |
| 进入图页取得节点 | 10 个 `data-node-id` |
| 点节点打开代码抽屉 | `mcp / src/mcp-server.ts:1065-1080`，含 why 与快照声明 |
| ESC 关闭抽屉 | 残留 `on` 面板 0 |
| 点「导出 ↓」触发下载 | 文件名 `kisearch-知识地图-2026-11-24.zip` |
| 全程脚本错误 | 0 |

**关键结论**：iframe 内**不需要任何 polyfill**，图集的 Shadow DOM、事件委托、`CompressionStream` 导出全部照常工作。前提是 `sandbox` 必须带 `allow-scripts allow-same-origin allow-downloads allow-popups`（少 `allow-downloads` 导出会被拦）。

### R-02 上传与校验 —— ✅ 通过（1 项调整）

| 断言 | 结果 |
|---|---|
| 分包上传，体积与 sha256 一致 | 254753/254753 字节，sha `9bad814a` |
| 重传覆盖 + 旧包归档 | `archive/` 出现 1 份 |
| 覆盖后体积变为新包 | 1266 KB |
| 缺 `baked:true` 被拒 | 400 `PACKAGE_INVALID`，文案指出「运行时会去找 atlas.config.json」 |
| 含外链资源被拒 | 400，指出具体 URL |
| 只读用户（viewer）上传 | 403 `SCOPE_FORBIDDEN` |
| 只读库上传 | 403 `SCOPE_READONLY` |
| 分片中断 | 未产生半成品 `atlas.html`，`status.exists=false` |

**⚠️ 调整项 A1（必须写进设计）**：**写接口的 scope 必须从 body 取，越权校验必须在读 body 之后。** 原型第一版从 query 取 scope，结果 `readonly-kb` 的写入用 admin 权限校验通过（返回 200），越权校验直接失效——这与 `/api/import/upload` 的 `body.scope` 口径一致，不能凭 URL 判权。

**⚠️ 调整项 A2**：分片中断会残留 `store/<scope>/.upload/<uploadId>/`（断言通过是因为没有生成 `atlas.html`，但暂存目录仍在）。需要过期清理，复用 `~/.ki/import-uploads` 的清理范式。

### R-03 首屏耗时 —— ✅ 通过

| 包 | 体积 | 用户可见 | iframe load |
|---|---|---|---|
| real | 249 KB | **100 ms** | 58 ms |
| synth | 1266 KB | **97 ms** | 32 ms |

**结论**：体积**不是**瓶颈，5 倍体积差异看不出差异（瓶颈是 iframe 创建与首次布局，不是传输解析）。需求 §3.2 的 20 MB 上限有充足余量，可保留（建议下调到 10 MB 更稳妥，无损体验）。

> synth 包是把 6 份 `overview.svg` 塞进 `<template>` 的体积注入近似，**不代表真实 6 图内容**；仅用于证明「体积翻 5 倍不影响首屏」。

### R-04 暗色主题 —— ⚠️ 有条件通过

- 实测：外壳 `data-theme="dark"` 时 iframe 背景恒为 `rgb(255,255,255)`，形成明显白板（见 `shots/R04-dark.png`）。
- 没有低成本解法：给 iframe 加 `filter: invert()` 会把图里的配色全部反转（archify 图有语义色，不可接受）；`postMessage` 注入主题需要图集侧支持，而框架当前零暗色实现。
- **结论**：接受为已知限制（需求 v4 §2.2 已声明）。若后续要修，正确路径是生成侧给图集加暗色主题，而不是产品侧做视觉转换。

### R-05 鉴权 —— ✅ 通过

| 断言 | 结果 |
|---|---|
| 未登录直接访问 `view` | 401 `UNAUTHENTICATED` |
| Cookie 会话下 iframe 正常加载 | 200，页面完整 |
| viewer（只读角色）可看图集 | 顶栏显示 sha / 体积 / 上传时间 |

**关键结论**：同源 iframe 导航会自动带 Cookie，**登录态不需要额外处理**；但 `Authorization` 头确实带不进去，所以「用 token 直连」的路径在设计里必须排除。

**⚠️ 调整项 A3**：iframe 直接加载失败时会把裸 JSON（401/404/403 响应体）渲染成一屏文字。产品页面必须**先查 `status` 决定渲染 iframe 与否**，不能让 iframe 吃错误响应。

## 4. 整体决策

| 风险 | 结论 | 后续动作 |
|---|---|---|
| R-01 | ✅ 通过 | 直接按 v4 实施 |
| R-02 | ✅ 通过 | 设计里落实 A1（body 取 scope）、A2（暂存清理） |
| R-03 | ✅ 通过 | 体积上限保持，可下调到 10 MB |
| R-04 | ⚠️ 有条件通过 | 接受为已知限制；不阻塞开发 |
| R-05 | ✅ 通过 | 设计里落实 A3（外层先查状态） |

**决策：进入开发**（R-04 为已声明的已知限制，不构成回退理由）。

## 5. 需要回写需求文档的调整项

| 编号 | 回写位置 | 内容 |
|---|---|---|
| A1 | 需求 §3 / R-01 | 写接口 scope 从 body 取，越权校验在读 body 之后 |
| A2 | 需求 §3.3 / 负向需求 | 新增 `.upload/<uploadId>/` 暂存目录 + 过期清理；对应新增负向条目 |
| A3 | 需求 R-02 / R-04 | `view` 的失败态由外层处理；页面先查 `status` 再渲染 iframe |
| A4 | 需求 R-04 | iframe `sandbox` 必须含 `allow-scripts allow-same-origin allow-downloads allow-popups` |
| A5 | 需求 §3.2 | 实测 249 KB 与 1266 KB 首屏无差异，体积上限可下调至 10 MB |
