---
groupPath: 错误库/Web前端界面
relation: 列表删除后整页抖一下：nth-child 动画延迟会重启入场动画
exportedAt: "2026-11-18T03:20:12.698Z"
---
事件详情页点「已确认位置」或「参考文档」的行尾 × 时整页抖一下，2026-11-18 定位到三处叠加原因，auto-review 后又补修四处。

- 主因：行列表入场动画用 `:nth-child(N) { animation-delay }` 做阶梯淡入（governance.css D 段）。删掉一行后后面所有行的序号都变 ⇒ animation-delay 变化 ⇒ 浏览器**取消并重启** `gov-rise` ⇒ 整个列表从 opacity 0 + translateY(5px) 重新淡入。修法：所有行共用一条 animation，不设逐行 delay。
- 第二处：`EventsPage` 的操作提示是普通块级 `<p>`，`run()` 里先 `setMessage(null)` 再 `setMessage(ok)` ⇒ 提示消失一次、出现一次 ⇒ 下面整块内容上下各被推一回。改为 fixed 浮层 `.gov-page-toast`。
  浮层四要素（缺一个就换一种问题）：① `pointer-events: none` 否则挡住右上角按钮；② `z-index: 900`（低于弹窗 998/抽屉 999，60 会被吸顶头部盖）；③ `run()` **不得**先 `setMessage(null)`（浮层卸载重挂会闪一下）；④ 成功 2.6s 自动消失、**失败不自动消失**（错误被自动收走等于用户没看到）。
- 第三处：`.gov-doclist .gov-docline` 末列写死 `22px`，二次确认时按钮从「×」变「确认」（两字）溢出/换行把行高顶起来 ⇒ 末列改 `auto` + `.gov-docline__x { min-width: 22px; white-space: nowrap }`。
- 同类隐患（暂未启用）：`.gov-reveal` 是 tsx 里已无引用的死样式，它用 `animation-delay: calc(var(--i) * 70ms)` 按下标设延迟 —— 将来启用会重蹈覆辙，已在源码处加警告注释。
- 回归锁：`web/test/event-source-analysis.test.mjs` 断言 governance.css 不得出现「.gov-* + :nth-child + animation-delay」、`.gov-page-toast` 为 fixed 且 pointer-events:none、z-index:900、末列不写死 22px、`.gov-docline__x` 有 min-width、`run()` 不得先 setMessage(null)。
- 排查确认无问题：`walWrite` 是 tmp+rename 原子写，前端轮询不会读到半截 draft；`.gov-cand` 的 inline `--i` 目前无 CSS 消费。