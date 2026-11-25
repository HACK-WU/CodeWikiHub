---
groupPath: 错误库/Web前端界面
relation: "事件列表两个渲染坑：inline-flex 徽标挂 ::before、bg-muted 不是灰"
exportedAt: "2026-11-19T07:12:05.109Z"
---
2026-11-19 事件列表改版踩到的三个视觉坑，症状都像样式写错，根因都不在样式本身。
- 坑1（分隔点跑进徽标背景）: 用 `.meta > * + *::before { content: '·'; margin: 0 5px }` 生成分隔点，但 `.gov-badge` 是 `display: inline-flex` —— 伪元素成了徽标内部第一个 flex item，那个点和它的 margin 被包进淡彩背景。表现：徽标宽 60px 而文字只需 52px，背景比文字宽一截、文字偏右。同一坑也影响 `.gov-ev__stage`（它自己还有圆点 ::before，两个伪元素互抢）。修法：分隔点改成真实节点 `.gov-ev__sep`，绝不挂在徽标元素上；JSX 实现同理。
- 坑2（灰不灰）: `--ki-color-bg-muted` = #f0f2ee，RGB(240,242,238) —— G 高 B 低，是暖绿中性，肉眼发绿。用户当场质疑「你这是灰色么」。要真灰必须单独提语义变量（`--gov-closed-bg: #fafafa`，R=G=B），深色再覆盖一次；不要用 color-mix 混绿灰凑中性。
- 坑3（sticky 分区标题吸顶后两侧都有缝）: 列表容器 `padding-top: 6px` 时，`sticky top:0` 的标题吸附在 padding box 上沿，那 6px 会露出正滚过去的内容；同时标题 `margin-bottom: 2px` + 首行 6px 圆角，让首行（尤其选中态）像一块浮起的胶囊。修法：容器 padding-top 改 0、标题 margin-bottom 改 0、紧跟标题的首行 `border-radius: 0 0 r r`。验证：滚动后 `groupTop === listTop`（offsetFromListTop 0）、`首行top - 标题bottom = 0`。
- 通用经验: 关闭 / 失效态靠「降权」（字重 650 → 400 + 文字变浅）比「铺一块底色」有效得多；底色一深就变成斑马块，比正常行更抢视线（用户：「关闭的要变暗，咋这么突出」）。验证方式：headless 取 computedStyle 看 backgroundColor / fontWeight / 伪元素 content，再用 scrollTop 复验吸附位置。