---
groupPath: 错误库/Web前端界面
relation: 面板开关写 URL 触发浏览页深链接重放
exportedAt: "2026-10-14T08:56:20.869Z"
---
【错误库｜面板开关写 URL 触发浏览页深链接重放】
- 现象：浏览页右栏正在显示文档列表的搜索结果（工具条搜索框里有过滤词）时，点一下 AI 对话开关，过滤词被清空、右栏被切回文档阅读态。属面板开合态改由 URL 承载后的副作用（2026-10-14 质疑阶段发现）。
- 根因：面板开合被镜像写入当前地址 ⇒ location.search 变化 ⇒ BrowsePage 的深链接 effect 依据 directTarget（searchParams.toString()）判定「URL 目标变了」，于是重跑一次 setViewing / setQ 清空 / setSearchQ 清空。
- 解法：给「URL 目标是否变化」的比较键剔除与本页无关的参数 —— lib/browseUrl.browseLinkKey() 删掉 chat 后再与 appliedDirectTarget 比较；页面自己写 URL 时用同一键登记并携带该参数（writeBrowseUrl 同时改为保留 chat 标记，避免每次打开文档多一次补写导航）。通用口径：镜像写入本身就是一次外部导航，先 grep 全仓 useSearchParams 自查依赖方。
- 验证方式：temp/probe-chat-toggle-side-effects.cjs（开关面板后过滤词与右栏视图不变、关面板后阅读位置与内容高度回到原值；修复前实测过滤词被清空）；web/test/browse-url.test.mjs 锁「开关面板前后比较键相同、真实目标变化时键仍不同」。
- 关联方案：.solutions/frontend/ui-state-url-vs-localstorage/