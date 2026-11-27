---
id: REQ-20261113-003
feature: 事件源码分析（只读）
document_type: rehearsal
created: 2026-11-16
updated: 2026-11-16
---

# 场景推演报告：`REQ-20261113-003` 事件源码分析（只读）

> 推演对象：设计文档模式（`DESIGN.md` + `S01`~`S05`）
> 证据性质：**推演结论（基于文档推理，未实际执行代码）**

## 1. 全局理解声明 + 角色清单

- **业务目标**：在隔离配置域管理目标代码目录与只读工具后，允许用户基于事件信息+文档清单异步定位代码并确认写入事件。
- **系统位置**：AI 设置（S-01）→ 异步分析执行器（S-04）↔ 沙箱（S-02）/ 存储（S-03）/ KB 读车道 → 事件页（S-05）& `ki_event_list`。
- **整体成功判据**：配置隔离、永久只读（`OUT_OF_ROOT` 拦截）、不塞文档正文（按需 `ki_get_module_info`）、不阻塞 KB 写、异步切页不丢结果、已收口放行。

| # | 角色 | 类型 | 权限层级 | 职责 |
|---|---|---|---|---|
| 1 | 管理员（admin） | 用户 | `ops.write` + `knowledge.write` | 修改「AI 分析」设置、编辑事件、触发分析、确认位置 |
| 2 | 编辑（editor） | 用户 | `knowledge.write`（无 `ops.write`） | 只读查看 AI 设置，正常触发事件分析、编辑描述与确认位置 |
| 3 | 只读用户（viewer） | 用户 | `knowledge.read` | 查看详情与已有代码位置，所有写入口禁用 |
| 4 | 后台分析任务 & 并发调度 | 程序 | 进程内 | 异步跑工具循环、读 KB `'read'` 车道、校验并落盘 |
| 5 | 外部 MCP Agent | 外部系统 | Token 只读/读写 | 调 `ki_event_list` 读代码位置摘要，无法见到或调用 `fs_*` |

## 2. 启用策略 Profile 与推演矩阵

- 启用策略：**事务/状态机类**（分析任务 `running → ready/partial/failed` 状态流转与重启恢复）+ **并发/竞态敏感类**（后台写草稿与用户确认/删除/KB 写入并发）+ **新增功能类**。

## 3. 核心场景推演路径

### 场景 A：正常分析 + 关窗后台运行 + 返回确认

```text
admin 配好目录(/root/knowledge-indexer) & 开启全部 8 个只读工具 ✅
  ▼
在已收口事件 #3 点「✨ AI 分析」→ POST /analyze 校验门禁通过 → 写 running(bootId) 立即 202 ✅
  ▼
用户点「后台继续」切走页面 → 后台注入标题+描述+阶段+文档清单(无正文) ✅
  ├─ LLM 自主调用 ki_get_module_info 读关联文档正文（走 read 车道，不阻塞其他写入）✅
  ├─ LLM 调用 fs_find / fs_grep / fs_read 定位代码（realpath 在 root 内）✅
  └─ 汇总后二次校验行号，剔除 1 条幻觉路径入 unconfirmed，落盘 ready ✅
  ▼
用户回到事件页 → 详情展示「有待确认草稿」→ 打开弹窗勾选并确认（传 expectedRunId）→ 写入 confirmed ✅
```

### 场景 B：异常与并发边界推演

```text
场景 B1（越权/路径逃逸）：LLM 传 fs_read('../../etc/passwd') 或仓内指向根外 symlink
  └─ resolveSafePath 经 realpath 拦截 → 返回 OUT_OF_ROOT（不泄宿主机路径）✅
场景 B2（并发覆盖风险）：后台分析运行中同时另一个标签页也在操作 .analysis.json
  └─ challenger 发现：若后台收尾写整份 EventAnalysisDoc 会覆盖并发写入的 confirmed[] ← ⚠️ 需在 S-03/S-04 显式锁定「后台只更新 draft 且比对 runId」
场景 B3（editor 访问设置页）：editor 打开 /ai-settings?cap=analysis
  └─ S-01 对齐 ops.write 后界面置灰只读，不再发生「可点但 403」✅
场景 B4（daemon 崩溃重启）：running 期间进程重启
  └─ bootId !== CURRENT_BOOT_ID 即刻判定为 failed(INTERRUPTED)，允许用户立即重试 ✅
```

## 4. 问题汇总与整体评估

| # | 类型 | 场景 | 问题描述 | 建议 | 严重度 |
|---|---|---|---|---|---|
| 1 | 并发竞态 | 场景 B2 | 后台写 `draft` 终态时若直接整文件重写 `.analysis.json`，可能覆盖在途确认/删除的 `confirmed[]` | `analysis-store.ts` 写 `draft` 时加 `withScopeWriteLock` 短锁读-改-写（仅改 `draft` 且校验 `runId`） | 🟡 警告（已记录，实施直接内置） |
| 2 | 输入校验 | 设置页目标目录 | 未限制视图名误填进 `byScope` | 设置页下拉只列 `scopes[]` 并要求绝对路径 | 🟢 建议 |

- **整体评估**：覆盖 5 个角色、4 类核心/异常场景；🔴 阻断 **0 个**、🟡 警告 **1 个**、🟢 建议 **1 个**。
- **评审结论**：⚠️ **有条件通过（推演未实际执行）**—— 在实施 S-03 `analysis-store.ts` 时落盘上述「`draft` 局部原子更新 + `runId` 校验」短锁机制即可安全进入编码。
