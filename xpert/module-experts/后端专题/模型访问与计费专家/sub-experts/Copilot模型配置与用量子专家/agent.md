# Copilot模型配置与用量子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（模型访问与计费专家）
- **资产路径**：`.module-experts/后端专题/模型访问与计费专家/sub-experts/Copilot模型配置与用量子专家/`
- **职责**：一句话：本子域是「**配置面 + 用量读侧**」的聚合边界——它决定「用哪个 provider 的哪个模型」，把配置装配成可用的模型客户端，并对外提供用量与配额的读写视图；账本本身的写权限不在这里。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/copilot`
  - `server-ai/src/copilot-provider`
  - `server-ai/src/copilot-model`
  - `server-ai/src/copilot-usage`
  - `server-ai/src/copilot-checkpoint`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 部分 Copilot 读端点没有权限点
  - provider 凭据不是加密列
  - `copilot_store_vectors` 的 `@Entity` 被整块注释
  - 组织级覆盖租户级的判定很窄
  - 可见性是「会员范围 × 授权目录」的乘积，还有直连例外
  - `GetChatModelQuery` 等是创建 LangChain 客户端的唯一入口
- **测试状态**：1. 测试总览与运行方式（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
