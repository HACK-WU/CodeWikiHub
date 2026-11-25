---
groupPath: 错误库/Web前端界面
relation: "入场动画 fill-mode:both 让合成层常驻、文字发糊"
exportedAt: "2026-11-23T09:16:35.182Z"
---
入场动画带 `animation-fill-mode: both` 时，动画跑完仍处于 fill 生效状态（playState=finished 但末帧继续套用），Chrome 会永久给该元素保留独占合成层；层内文字拿不到子像素抗锯齿（灰度 AA、观感发毛），滚动时按纹理采样而非重绘，糊感被放大。有 `animation-delay` 时还会把计算后的 matrix 留下 —— 变成层叠上下文 + fixed 包含块（`.ki-chat-cfg__field` 那条 2026-11-16 踩坑即此）。
- 判据: 末帧若等于元素自然样式（`to { opacity:1; transform:none }` 或 keyframes 只写了 `from`），fill 无任何收益，去掉即释放合成层；有 delay 用 `backwards`，末帧"才是想要的最终态"（如 `ki-cfg-hint` 渐隐到 transparent）才保留 `forwards/both`
- 已收敛: `governance.css` 的 `gov-rise` 三处 + `ki.css` 九处（drawer / scrim ×2 / chat-overlay / cfg mask+card / chat-msg / chat-tool / detail）；`ki-cfg-hint` 有意保留
- 验证: 2x DPR 截图的子像素彩边强度 —— 已确认位置行 16.79 → 46.95、聊天气泡 12.05 → 45.12；`.ki-drawer` 结束后 computed transform `matrix(1,0,0,1,0,0)` → `none`；首帧 opacity 仍从 0 起（不闪）
- 边界: 子像素指标只在启用 LCD 文字的平台上可测（本次 Linux Chromium）；macOS 全程灰度 AA，该指标不适用，但"常驻合成层 + 纹理采样 + 残留 matrix"与平台无关
- 证据: `.debug/ui-codeloc-blur-20261123/`