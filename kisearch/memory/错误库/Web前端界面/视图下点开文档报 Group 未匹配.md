---
groupPath: 错误库/Web前端界面
relation: 视图下点开文档报 Group 未匹配
exportedAt: "2026-11-20T07:02:54.969Z"
---
治理页在视图模式下点开文档正文时，把「来源库 · 组名」这类展示文案当成 Group 传给 /api/doc/get，后端解析失败、抽屉显示「加载失败」；切回单库正常。
- 报错原文片段：Group "kisearch-memory · 错误库" 未匹配到有效路径；⚠️ 路径 "kisearch-memory · 错误库" 未匹配到任何 Group。可用的顶层 Group：…
- 现象：顶栏选视图时，事件详情「参考文档」点开的正文抽屉报加载失败；切回单库（事件所属库）一切正常。
- 根因：DocRow.group 一个字段同时承担展示与定位。参考文档卡把「sourceScope · group · 失效标记」拼成展示串赋给 group，DocLine.onOpen 又原样回传给 setDocTarget。视图下顶栏 scope 是视图名、与 ref.sourceScope（真实库）必然不等，故每次都拼串；单库两者相等所以不复现。伴生缺陷：docTarget 只有 group + name，跨库引用时抽屉只能退回事件库读正文。
- 解法：展示与业务键分离——DocRow 增加 meta（展示串）与 sourceScope（所属库），group 只放真实路径；docTarget 带上 scope，ModuleDrawer 用 docTarget.scope 且 key 含 scope。口径对齐分类页既有实现（LifecyclePage 用 doc.scope）。
- 验证方式：node --test web/test/governance-doc-open-ui.test.mjs（新增用例「参考文档行：group 必须是真实组名，展示文案只走 meta」）；直接调 executeGetModuleInfoLocal 复核：group=错误库 返回正文，group=kisearch-memory · 错误库 报未匹配到有效路径。
- 关联方案：无