# 模型访问与计费专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/模型访问与计费专家/`
- **职责**：本专家回答「谁能用哪个模型、以什么凭据调用、这次调用算谁的钱」。它把模型可见性（申请与授权台账）、执行凭据（一次性凭据与准入预占）、对外调用面（OpenAI 兼容与 native 协议）、以及积分账本与会员计划串成一条可审计闭环：任何一次模型调用只有在拿到供应商权威用量事实后才可能产生消费，估算值永远不产生扣费，未知结果只保留占用而不由人工改库释放。
- **子专家**：子专家①[Copilot模型配置与用量子专家](file://.module-experts/后端专题/模型访问与计费专家/sub-experts/Copilot模型配置与用量子专家/C0-使用总览.md) · 子专家②[会员与积分账本子专家](file://.module-experts/后端专题/模型访问与计费专家/sub-experts/会员与积分账本子专家/C0-使用总览.md) · 子专家③[模型访问与执行子专家](file://.module-experts/后端专题/模型访问与计费专家/sub-experts/模型访问与执行子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server-ai/src/model-access`
  - `server-ai/src/model-execution`
  - `server-ai/src/model-gateway`
  - `server-ai/src/membership`
  - `server-ai/src/copilot`
  - `server-ai/src/copilot-provider`
  - `server-ai/src/copilot-model`
  - `server-ai/src/copilot-usage`
  - `server-ai/src/copilot-checkpoint`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 两套 OpenAI 兼容入口混用
  - 敏感列不显式选取时静默取空
  - GET 设置接口有写副作用
  - 自助查询端点没有权限点，靠三重相等判定
  - 预占残留只能经管理端核对释放
  - 账本唯一性是「一次调用只计一次」的底线
- **测试状态**：本域（model-access、model-execution、model-gateway、membership、copilot 系 10 目录、ai-model）共有 **71** 个测试文件：`.spec.ts` 68 个 + `.test.ts` 3 个。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
