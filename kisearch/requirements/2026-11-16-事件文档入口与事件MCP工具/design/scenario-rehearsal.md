# 场景推演 · REQ-20261116-004 设计

- 推演对象：`design/DESIGN.md` + S01/S02/S03
- 推演方式：以执行者（写权限用户 / MCP 客户端 / 只读用户）为入口，沿设计走完整链路，逐跳核对数据走向与设计点是否落地
- 时间：2026-11-16

## 链路 A：页面主流程（建事件 → 挂文档 → 解绑）

| 步 | 动作 | 数据走向 | 设计点核对 | 结论 |
|---|---|---|---|---|
| 1 | 建事件，选 A/B 关联 + C 参考 | 页面 → `POST /events{docs,refs}` → `createEvent`（持 `event-create` 锁）→ `bindMembersLocked` → 分片写入 → `applyVisibilityBatch` → `addRefs` | 锁不重入（D16）✅；上限 50 按「绑定后总数」判 ✅；C 与 A/B 交集 → skipped ✅ | 通过 |
| 2 | 事件落首阶段（hidden） | A/B 由 `full` 摘 dense/fts/relation；组内全 hidden 时摘 path | `applyVisibilityBatch` 从快照取 `from`（改字段前）✅ | 通过 |
| 3 | `ki_search` 搜 A 的正文 | 无 dense/fts → 不命中 | `visibilityFailed[]` 为空时展示"不可检索"可信 | 通过（摘除失败见链路 C） |
| 4 | 添加 D（已属事件 #3） | 后端 409 语义进 `failed[]`，A/B 不受影响 | 校验顺序 1-8 逐条独立 ✔️ | 通过 |
| 5 | 解绑 A | `from=hidden → to=full`；pending 含 `dense/fts/relation/path` | §3.1.2 已补 path；`consumePending` 被触发（D8） | 通过 |
| 6 | 立刻搜索 A | 可能仍搜不到（补索引异步） | 返回 `hint` 明示"数秒后生效" ✅ | 通过（提示义务已落地） |
| 7 | 事件列表 | `updatedAt` 已更新 → 冒泡到首位 | §3.1 已补；`revision` 未动，页面描述编辑不冲突 | 通过 |

## 链路 B：MCP 全流程

| 步 | 工具 | 数据走向 | 设计点核对 | 结论 |
|---|---|---|---|---|
| 1 | `ki_event_type_list` | 读类型与阶段 | 只读工具，无变更 | 通过 |
| 2 | `ki_event_create{type:'et_1', stage:'排查中', docs, refs}` | 名称解析 → `createEvent` | `stage` 收名称需扩展 `createEvent`（S-03 §6 已列）✅ | 通过 |
| 3 | `ki_event_docs{action:'add'}` | → `bindMembers`（抢锁版） | 工具走抢锁版、`createEvent` 走 locked 版（D16）✅ | 通过 |
| 4 | `ki_event_set_stage` 到终态（keep） | `applyTerminalAction` 解绑成员 → `enqueueVisibility(full)` | 收口后成员已回 wiki | 通过 |
| 5 | `ki_event_delete{doc_action:'wiki'}` | `collectMembers` 为空 → `affected.docs = 0` | **原 Demo 写 `docs:3` 与事实不符** → 已修正为 0 并改写 hint | 已修 |
| 6 | 删除后 `tools/list` | 4 个工具仍在（Token 未变） | 与只读隔离无关 | 通过 |

## 链路 C：异常与权限

| 步 | 场景 | 期望 | 设计点核对 | 结论 |
|---|---|---|---|---|
| 1 | 只读 Token 调 `ki_event_create` | 工具不在 `tools/list`；构造调用被 `findReadOnlyViolation` 拦 | S-03 §3.3 ✅ | 通过 |
| 2 | viewer 点「＋ 添加」/「×」 | 按钮 disabled + `title="需要写权限"` | **原设计未声明** → 已在 S-01 §3.5 补门禁说明 | 已修 |
| 3 | 向量引擎不可用，绑定到 hidden | 绑定成功 + `visibilityFailed[]` + 页面警示条 | S-01 §5.1/§7/§3.5 + S-03 §3.2 ✅ | 通过 |
| 4 | 双窗口快速连点「＋ 添加」 | 首次消费在飞，第二次复用同一 Promise | D8 in-flight Map ✅ | 通过 |
| 5 | 数据源文档（`isImported`）被选 | `failed[]` + `DATASOURCE_LIFECYCLE_LOCKED` | 逐条判定 B2 ✅ | 通过 |
| 6 | 已收口事件加文档 | `EVENT_CLOSED` | 批次前置 A2 ✅ | 通过 |

## 发现与处理

| # | 发现 | 等级 | 处理 |
|---|---|---|---|
| 1 | `ki_event_delete` Demo 的 `affected.docs=3` 与"收口时成员已解绑"矛盾 | 🟡 | 已改为 0 并改写 hint |
| 2 | 新增 3 处前端写入口未声明只读账号门禁 | 🟡 | 已在 S-01 §3.5 补「只读账号门禁」段 |
| 3 | `enqueueVisibility`（`event-service.ts:621`）与 `applyVisibility` 双写同一 pending 文件、无共享锁 | 🟢 | 记录：两者格式兼容，`consumePending` 幂等；若后续出现丢条目，统一改为只走 `applyVisibility` |
| 4 | 解绑后立刻搜索可能不命中 | 🟢 | 已有 `hint` 明示，非缺陷 |

## 结论

⚠️ **有条件通过**：链路 A/B/C 主路径数据走向自洽，2 项 🟡 不一致已修入文档；剩余 2 项 🟢 为实现注意，不影响设计成立。范围问题 Q3（path 修复是否同批）仍待用户拍板。
