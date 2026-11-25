---
groupPath: 错误库
relation: 可选字段 PATCH 三态的两个必踩坑（省略≠清除）
exportedAt: "2026-11-23T09:49:55.806Z"
---
可选字段的 PATCH 三态（省略=不改 / 空串或 null=清除 / 有值=写入）在实现上有两个必踩的坑，2026-11-23 做事件类型描述字段时逐条验证并绕开。

- 坑 1（对象展开吃掉了清除）：`{ ...current, ... }` 会把旧值带过来，因此只写「有值才赋值」的分支永远清不掉字段 —— 清除必须显式 `delete next.xxx`。
- 坑 2（HTTP 辅助吃掉空串）：`str(b.x)` 这类「非空才取」的辅助会把空串当成「没传」，用户清空了却不生效，且无报错。判定要换成 `Object.prototype.hasOwnProperty.call(b, 'x')`，区分「传了空串」与「没传」。
- 前端对称口径：提交时清除要**传空串而不是省略字段**；编辑态用 `null` 表示「没在编辑」，不要用空串（否则「未编辑」与「正在清空」同形）。
- 位置: `src/lib/events/type-service.ts`（normalizeTypeDescription / updateType）、`src/lib/governance-http.ts`（event-types POST/PATCH）、`web/src/pages/EventsPage.tsx`（patchType / descDraft）
- 测试形状: 断言「省略后值不变」+「空串后字段为 undefined 且文件里无空串」两条，缺一不可。