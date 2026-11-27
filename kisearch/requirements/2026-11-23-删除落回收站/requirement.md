---
id: REQ-20261123-005
feature: 删除落回收站
status: 已确认
created: 2026-11-23
updated: 2026-11-23
version: 1
tags: [feat, mcp, web, governance]
depends_on: []
author: AI
document_type: requirement
---

# PM 报告：删除操作落回收站（MCP + 页面 + CLI）

模式：M1 需求定义（一次成型档）
证据声明：最高 **🟢 实证（代码直读）**——删除链路、回收站存储与服务、组删除执行层、Web 删除入口与文案、契约 DTO 均已读到源码。**未运行实测**（未起 daemon 跑真实删除），验收环节须以真机走查补齐。

**拍板结论（2026-11-23，用户确认）**：策略 **C 档 + MCP 空组入站（选项 A）** —— MCP 仍只删空组（不加破坏力），CLI 非空组删除也入站（运维可恢复）；MCP 删空组同样入站；清库 / 删 scope 保持物理删除、不入站。

## 1. 执行摘要

- **三条需求里两条已经是现状**：Web 删文档与 MCP `ki_delete_relation` 都已走 `executeDeleteRelation` 的回收站闸门，文档确实进了 `.trash/`。缺口在产品面——弹窗仍写「删除后无法恢复」（`web/src/components/DocDeleteDialog.tsx:153`）、资源页写「删除不可恢复，也没有回收站」（`web/src/pages/ResourcesPage.tsx:130-134`）、`DeleteDocumentResponse` 不透传后端已有的 `trash` 回执。🟢
- **真正的功能缺口只有组删除**：`ki_group_delete_empty` 与 CLI `ki group delete` 共用 `executeGroupDelete`（`src/lib/group-delete.ts:497`），全程 `fs.rmSync` 物理删除，无快照。🟢
- **空组能不能复用现有回收站？不能**：`moveToTrash` 在正文为空时 fail-closed 拒绝（`src/lib/trash-service.ts:73-79`，`TRASH_CONTENT_MISSING`），空组接进去会 100% 删不掉。组快照必须是**独立类型**。🟢
- **清库会连带清掉既有回收站**：`clearKbDir` 遍历删该库目录下所有条目（`src/scope.ts:72-79`），`.trash` 也在其中；`removeKbDir` 整目录删（`:64-69`）。"不进站"之外还需告知用户这一连带后果。🟢
- **可行性 / 复杂度**：5 条需求中 2 可实施（低复杂度）、2 有条件（中/高）、1 有条件（低）；整体复杂度 **高**（主导：数据与状态 —— 组快照模型与恢复顺序）。

## 2. 现状与范围

**范围**：回收站存储与服务（`src/lib/trash-store.ts` / `trash-service.ts`）、组删除执行层（`src/lib/group-delete.ts`）、文档删除回执（`src/lib/doc-delete.ts`）、治理 HTTP 回收站端点（`src/lib/governance-http.ts`）、契约 DTO（`src/lib/governance-contract.ts`）、MCP 工具描述（`src/lib/mcp-tools/delete-relation.ts` / `group.ts`）、Web 删除弹窗与回收站页。

**不在范围**：scope 级入站（清库 / 删库保持物理删除）；回收站「清空」按钮（现状本就没有）；wiki 源文件回滚（源 .md 是物理 unlink，回收站只保知识库副本）；MCP 侧新增回收站读 / 恢复工具（列为后续需求）。

## 3. 需求清单

| ID | 需求 | 优先级 | Kano | 证据 |
|----|------|--------|------|------|
| N1 | 文档删除的产品面暴露：弹窗改口、源文件警示、回执透传 `trash`、MCP 工具描述补「可恢复」 | P0 | 必备 | 🟢 |
| N2 | 组快照存储与回收站类型扩展（`kind` 字段 + 组快照目录布局 + 契约 DTO） | P1 | 必备 | 🟢 |
| N3 | 组删除入站：`executeGroupDelete` 在删任何数据前写组快照，失败即中止；MCP 空组与 CLI 非空组共用 | P1 | 必备 | 🟢 |
| N4 | 组条目恢复：重建组树节点 + 逐篇写回 + 索引重建入队 + 部分失败可重试 | P1 | 必备 | 🟢 |
| N5 | 回收站页支持组条目（行形态 / 筛选段 / 恢复入口）+ 清库提示回收站连带清空 | P2 | 期望 | 🟢 |

## 4. 影响面

| 受影响功能/方 | 影响类型 | 影响程度 | 证据 | 需拍板 |
|---|---|---|---|---|
| 回收站存储模型 `TrashItem` | 数据 | 破坏 | `trash-store.ts:30-51` 只有文档语义 | 已定：新增 `kind` + `groupSnapshot` |
| 回收站恢复链 | 数据 | 降级 | `trash-service.ts:171-179` 只 mkdir，不重建树节点 | 已定：S04 补建 |
| 契约 DTO | 外部契约 | 破坏 | `governance-contract.ts:205-220` | 已定：扩 `kind` / 组字段，存量缺省 `doc` |
| 回收站页 / 计数 / 视图聚合 | 展示 | 降级 | `TrashPage.tsx:110,262-267`；`governance-http.ts:2033,2069` | 随 S02/S05 |
| 清库 / 删库 | 数据 | 破坏 | `scope.ts:64-79` 连带清 `.trash` | 已定：保持物理删除 + 提示 |
| wiki 源文件 | 数据 | 破坏 | `delete-relation.ts:319-360` 物理 unlink | 已定：文案告知，不恢复源文件 |

## 5. 负向需求

1. **入站失败必须中止删除**：组快照任一环节失败即整体中止（对齐文档级 fail-closed），不得「删了但没备份」。
2. **同名组冲突**：删组后重建同名组 → 恢复必须拒绝（`RESTORE_NAME_CONFLICT`），不静默合并。
3. **恢复部分失败**：先建树节点再逐篇回写；失败项保留在回收站可重试，返回 `restored / failed` 明细。
4. **重复删除同名组**：`dirName` 强制 `__group__` 前缀 + 时间戳后缀，与文档条目及历史组条目互不覆盖。
5. **保留段校验**：组路径不得含 `.trash` 段，避免与回收站根目录撞位。
6. **只读账号**：回收站可看不可恢复；组条目同样受 `knowledge.write` 约束。
7. **清库连带**：清库前告知「回收站 N 条将一并清除」，不阻断但必须显式提示。
8. **空组条目无正文**：`kind='group'` 的条目不得套用 `sizeBytes === 0 ⇒ 禁用恢复` 的判据（该判据只适用于 doc）。

## 6. 关键假设

| ID | 假设 | 错了会怎样 | 验证方法 |
|---|---|---|---|
| A1 | 组快照可复用现有 `.trash/{group}/{dirName}/` 布局承载，无需独立根目录 | 需改 `trashItemDir()` 与 list/restore/purge 全部定位逻辑 | 阶段 4 已核对 `listTrash` 的 walk 语义（`trash-store.ts:215-240`），成立 |
| A2 | 组快照体积可控（整组文档 + 附件 × keepDays） | 磁盘撑爆 | 实施后实测最大组快照体积 |
| A3 | 恢复组时逐篇重建索引可接受（N 篇 → N 条 pending） | 恢复后检索长时间不可见 | 恢复后 pending 队列消费时延实测 |

## 7. 建议下一步

进入技术设计（已产出 `design/DESIGN.md` 与 S01~S05）。
