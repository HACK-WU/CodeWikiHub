---
id: REQ-20261113-003
feature: 事件源码分析（只读）
document_type: review
created: 2026-11-16
updated: 2026-11-16
---

# 二次质疑报告（Challenger）：`REQ-20261113-003` 事件源码分析（只读）

## 1. 全局回扣质疑

| 维度 | 结论 |
|---|---|
| **目标回扣** | ✅ 成立：通过独立目标目录配置 + 轻上下文 + 专属 `fs_*` 沙箱 + `ki_get_module_info` 按需读正文，打通了「事件信息 + 仓库代码定位」全链路且不污染知识库检索与对话权限。 |
| **位置回扣** | ✅ 成立：`S-01` 配置与全局设置共享 `ops.write`、`S-04` 后台循环不占 KB 写锁、`S-02` 物理隔离于 `CHAT_MCP_TOOLS` 与 `/mcp`，与上游治理与下游阅读链路均兼容。 |
| **判据回扣** | ✅ 成立：覆盖了 `OUT_OF_ROOT`、异步不丢进度、幻觉剔除、已收口放行、不阻塞 KB 写等全部核心验收指标。 |

---

## 2. 反对意见与潜在风险点

1. **🟡 [设计层面 · S-01/S-04] `PromptConfig.analysis.targetDirs.byScope` 填写体验与 scope 重命名/视图名误填**
   - **质疑**：用户若在 `byScope` 里误填了「视图名」（如 `kisearch-docs`）而非真实 scope 名，或者配置了相对路径，设置页与运行时如何明确反馈？
   - **建议**：`S-01` 校验 `targetDirs` 时允许下拉从 `scopes[]` 选取（过滤视图），并强制校验必须为绝对路径（`path.isAbsolute`）。
2. **🟡 [设计层面 · S-03/S-04] 并发下 `confirm` 与 `draft` 节流写的写盘竞态**
   - **质疑**：`S-04` 后台运行结束前万一有异常延迟，或在运行期调用了 `DELETE /analysis/draft` / `POST /analysis/confirm`，后台循环收尾写回 `.analysis.json` 时可能覆盖已经确认的 `confirmed[]`！
   - **建议**：`analysis-store.ts` 所有的 `.analysis.json` 写操作（后台写 `draft` 进度/终态、用户 `confirm`、用户 `discard`、删除 `confirmed`）**必须全部封装在同一个 per-event 短写锁或读-改-写串行函数内**（只锁 `draft` 字段更新、保留磁盘最新的 `confirmed[]`，且后台写终态前校验当前磁盘 `draft?.runId === runId`）。
3. **🟢 [代码层面 · 可延后] `fs_grep` 对单行极长 minified 文件（如 500KB 压缩 JS 一行）的内存占用**
   - **质疑**：按行切分时若碰到未进忽略列表的单行极长压缩文件，单行即可占数百 KB。
   - **建议**：`💤 可延后`：实施 `S-02` 时在行切分或匹配前加「单行 > 16KB 跳过」防御即可。

## 3. 认可点与替代方案评估

- **认可**：把 `fs_*` 物理隔离出 `CHAT_MCP_TOOLS`、KB 工具走 `'read'` 车道不阻塞写库、`EventRecord.description` 与 `.analysis.json` 独立落盘，均精准规避了高代价架构陷阱。
- **替代方案**：`confirm` 与后台写终态竞争若不加 `runId` 匹配校验，改用「整文件覆盖」必然丢 `confirmed`；采用「per-event 读写锁 + 只局部更新 `draft` 并校验 `runId`」是零成本根治方案。

**综合风险评级**：🟡 中（其中 #2 的 `draft` 覆盖 `confirmed` 竞态建议在实施前直接纳入 `S-03`/`S-04` 约定）。
