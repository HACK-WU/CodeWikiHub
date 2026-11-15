---
groupPath: 决策记录/知识治理
relation: 参考文档手动添加与治理页 scope 跟随
exportedAt: "2026-11-15T13:00:52.714Z"
---
2026-11-15：参考文档区「＋ 添加」（`AddRefModal`）的对齐与两轮修正。

## 路由
手动搜索走 `GET /governance/docs/search?scope=&q=&eventId=`（**不再**打 `POST /refs/search` —— 那个端点已收窄为只出 AI 候选）。带 `eventId` 时后端排除「该事件已关联 / 已加入参考文档」（R31 服务端兜底），前端只保留「已加入」禁用态兜竞态。

## 行为口径（= demo `renderRefSearch`）
- **空查询不过滤**：打开弹窗就列出可加入的前 20 篇。初版 `searchDocsForAdd` 空 q 直接 `return []`、前端又短路不发请求 → 弹窗一片空白且无任何提示（用户走查抓到的）。
- 0 命中文案：`没有匹配的文档（已排除关联文档与已加入的参考文档）` + 核对 scope 提示；空查询 0 条则提示"都已关联/已加入，或库本身为空"。
- 候选行与 demo 同构：一行小字 `group · 可见性`（不再拆成右侧圆点列），与 AI 候选行同款。
- 主按钮：`未选择`（禁用） / `加入所选 N 篇`。
- 换一批结果 **scrollTop 归零**（否则上一批滚动位置会把首行裁半截）。
- 防抖：有查询 250ms，空查询 0ms；`alive` 标记防先后响应串序。

## 仍在的坑（未变）
- 治理三页曾写死 `scope='default'`，已统一 `useScopeValue()`（默认值就是 default，向后兼容）。
- 本机数据分裂：事件在 `default`（#3~#7），知识文档都在 `kisearch-memory` → 「＋ 添加」在 default 下 0 命中。空态文案点名"换 scope"，**不跨库偷数据**。

## 验证
`test/refs-sr05-search.test.ts` 17 例（含「空查询列出前 N 篇」）；`web tsc` + `vite build` 通过。注意：**后端改动需重启 `ki mcp` 才生效**（vite dev 只热更前端）。