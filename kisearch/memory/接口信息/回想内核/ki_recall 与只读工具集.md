---
groupPath: 接口信息/回想内核
relation: ki_recall 与只读工具集
exportedAt: "2026-11-25T08:06:24.396Z"
---
ki_recall 对外接口清单（基线 0f1426b）。
- MCP 工具：ki_recall，入参 scope?（库名/视图/逗号串/数组，故意 optional）、task、hints?、exclude?、limit?。
- 进程内只读工具：ki_search、ki_get_module_info、ki_group_list、ki_tag_list、ki_get_image（分析主链路另有 ki_recall 自身与 ki_scope_list）。
- 工具错误码 12 个：RECALL_SCOPE_REQUIRED / SCOPE_FORBIDDEN / TARGETS_EMPTY / THROTTLED / TIMEOUT / INTERNAL 等；内核 8 码经 toolCodeForKernel 单表映射。
- 无独立 HTTP 端点，由 analyze / ask 链路进程内调用。
- 位置：src/lib/mcp-tools/recall.ts、src/lib/recall/codes.ts、src/lib/recall/targets.ts。