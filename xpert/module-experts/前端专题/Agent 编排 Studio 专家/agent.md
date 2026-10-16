# Agent 编排 Studio 专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 环境事故后恢复——`implementation/{02,03,04,05,06,07}` 与 `test/known-failures.md` 为**原产出提取**（保留原作者口径与 `file.ts:行号` 引用风格）；`implementation/01-架构.md` 与契约层 `C0/C1/C2/C4/C5` 为**本次重建**（按 R1–R7，不写行号）。资产原基线 commit `c07bb83d`（2026-10-14），仓库现为 `80f5676fd`。

- **类型**：父专家（前端专题 · 无子专家）
- **资产路径**：`.module-experts/前端专题/Agent 编排 Studio 专家/`
- **职责**：Xpert 平台的 **Agent / Workflow 可视化编排画布**——以 `@foblex/flow` 为渲染内核，把后台「草稿（draft）」渲染成可拖拽编排图（34 类节点 + 连线 + 分组 + 自动布局），配套右侧配置面板联动、草稿自动保存与撤销重做、版本发布、运行期执行状态可视化（预览调试 / 状态检查器 / 检查点重跑）与 Copilot 辅助编排；同时作为**知识库流水线的复用宿主**（画布组件被其他页面直接复用）。
- **覆盖目录**：`apps/cloud/src/app/features/xpert/studio`（**168 个非 spec .ts / 16850 行**；Angular 17 standalone + signal + elf store）
- **入口路由**：`/xpert/x/:id/agents`（`features-routing` → `features/xpert/routes` → `xpert/xpert/routes` 的 `:id/agents`）

- **核心能力（完整见 `C0-使用总览.md`）**：
  - 编排编辑：画布渲染、节点/连线创建与删除、分组、自动布局、右键菜单、工具条
  - 草稿机制：**仅草稿保存（draft-only saves）** + 1s 去抖自动保存 + unsaved 态 + `TXpertTeamDraft` 落 `Xpert.draft`
  - 撤销重做：**双轨**（elf-state-history + 语义历史）
  - 版本与发布：发布固化 `graph` 与版本行、版本查看、`resume()` 回到已发布态
  - 执行可视化：触发执行 → **SSE（`fetchEventSource`）** 流 → 节点状态/状态检查器/执行面板；检查点重跑
  - Copilot 辅助编排：走 `xpert-studio-copilot-server.service.ts`（后端能力，不经前端直连模型）
  - 画布复用：知识库流水线等页面直接 `imports` 画布组件
  - 资源位：工作区 / 知识库 / 工具集 / 环境 / 业务域 / 协作者

- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - **仅草稿保存**：编辑先入草稿，只有 publish 才固化版本；`resume()` 会丢弃草稿
  - **撤销重做双轨**：elf 状态历史与语义历史不一致时表现为「撤销后配置面板与画布不同步」
  - **执行态是 SSE 不是轮询**：断线重连与订阅生命周期管理不当会漏事件
  - **34 类节点是注册式扩展**：新增节点类型需同步改注册表 + 配置面板 + 校验
  - **`XpertExecutionService` 是执行态唯一入口**：绕过它会出现状态不一致
  - **`@milkdown/crepe` 依赖缺失**：导致 Studio 1 个 spec 加载失败（同根因另有 17 个 apps/cloud spec）

- **测试状态**：**部分可跑**——9 spec = 6 PASS / 3 FAIL（2 个环境级缺依赖 + 1 个真实断言失败），失败根因与修复路径见 `test/known-failures.md`（含 2026-10-14 项目级实测记录：`apps/cloud` 共 442 spec，1 个因缺依赖失败、同根因波及 18 个）
- **何时用**：改画布/节点/配置面板 · 查草稿与版本机制 · 排查执行可视化 · 复用画布嵌入到其他页面 · 查编排相关前端接口 · 需要跨端对照时看后端「Agent 执行链专家」（`xpert-agent` 图编译 / `xpert-agent-execution` 执行账本）
- **发现入口**：`.module-experts/INDEX.md` · `.module-experts/前端专题/T0-专题总览.md` · ki `专题记忆/前端专题/Agent 编排 Studio 专家`
