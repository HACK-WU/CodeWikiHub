---
groupPath: 项目踩坑点
relation: 原生事件处理器里注册 rAF 会在 React 提交前执行（聚焦静默失效）
exportedAt: "2026-10-15T09:59:58.416Z"
---
【项目踩坑点｜原生事件处理器里注册 rAF 会在 React 提交前执行（聚焦静默失效）】2026-10-15 实测（REQ-20261015-004 实施中）

## 现象
Ctrl+F 带入选区后，查找栏输入框**有值、命中已计算**，但**没有聚焦、没有全选** —— 页面验证 A3/A5 全绿、A4 失败（`document.activeElement` 不是输入框、`selectionStart/End` 未全选）。只有"聚焦那一半"静默失效，无任何报错。

## 根因
写入发生在 **window 原生 keydown 处理器**（不是 React 事件）里，其中 `window.requestAnimationFrame(() => input.focus(); input.select())` 在**输入框挂载之前**执行 —— 此时 `findInputRef.current === null`，回调直接 return。React 对原生监听器里的 setState 不保证同帧提交（对比：React 事件处理器内的离散更新会同步 flush）。

## 解法（本项目采用，web/src/components/ModuleDrawer.tsx）
把"聚焦/全选"从处理器挪进 effect：写入时递增一个**序号 state**（`findSeedSeq`）→ 依赖该序号的 effect 在**提交后**注册 rAF → 此时 ref 已就绪。与既有"展开时预填"effect 同款时序。
**通用判据**：凡是"改了 state 之后要操作刚渲染出来的 DOM / ref"的动作，都必须在 effect / useLayoutEffect 里做，**不要在原生事件处理器里自己 rAF**。

## 验证方式
temp/verify-doc-selection-shortcuts.cjs 的 A4：断言 activeElement 是查找输入框且 selectionStart===0 && selectionEnd===value.length。修复前 A4 ✗（findFocused=false, all=false），修复后 ✓（同脚本 25/25 全绿）。