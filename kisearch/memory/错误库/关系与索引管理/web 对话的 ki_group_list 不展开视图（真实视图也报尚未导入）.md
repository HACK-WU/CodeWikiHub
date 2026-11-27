---
groupPath: 错误库/关系与索引管理
relation: web 对话的 ki_group_list 不展开视图（真实视图也报尚未导入）
exportedAt: "2026-11-26T10:22:11.534Z"
---
web 对话内置的只读工具不展开视图：视图名当物理库名 → group_list / get_module_info 报「尚未导入」、tag_list 静默返回空、get_image 报文件缺失。2026-11-26 已全部修复（#110，两轮）。
- 现象判据: 响应含 ok/error/hint、入参无 scope（group_list 入参只有 groups/mode/depth），即可判定是对话通道
- 根因: 展开逻辑只写在 **CLI 的 action**（group.ts / get-module-info.ts）与 MCP 工具层，`src/lib/chat/mcp-tool-registry.ts` 直接调 executeXxx
- 修复: 三个共享入口 —— `group-list-view.ts::queryGroupByScope`（按成员分桶）、`get-module-info-view.ts::getModuleInfoByScope`（member 优先 → 逐库探测 → 多命中 fail-loud）、`tag-list-view.ts::tagListByScope`（合并累加 + scopes 溯源）；chat 的 get_module_info / get_image 补 `member` 参数（get_image 校验 member ∈ 视图成员，防越权）
- 视图整体上限 `VIEW_TOTAL_TIMEOUT`（MCP 50s / 对话 90s），超时剩余成员进 skipped；视图返回体带 `memberTotal` 供截断对账
- 验证: chat-tool-view 8/8、mcp-tool-view 9/9、chat/mcp-tool-registry 18/18、scope-view 27/27、search-view 10/10；真机 chat 与 MCP HTTP 均 ok（get_module_info 自动标 member、tag_list count 161）
- 教训: 判断「某能力核心已支持」必须**实测该入口**；文件里出现 resolveScopeTargets 不代表核心展开（可能只在 CLI action 里）
- 边界: CLI 保留自有展开；analysis-runner / recall tool-runner 视图只取首个成员（#112）；MCP 的 ki_get_image 未加视图处理
- 关联: #110（已关闭）、#112；证据 `.debug/view-scope-monitor-docs-20261126/evidence.md`（E-10/E-11/E-12）