# 助手定义与发布子专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：子专家（Assistant 定义与运行时专家）
- **资产路径**：`.module-experts/后端专题/Assistant 定义与运行时专家/sub-experts/助手定义与发布子专家/`
- **职责**：本子专家负责 **Assistant 的创作侧**：把 `xpert` 表里一行「空壳」推到「可运行版本」，推出后仍能改草稿、换版本、导入导出、改配置与外观。它管「怎么定义与发布」，**不管「发布后谁能调用」**。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server-ai/src/xpert（创作侧：定义 / 草稿 / 发布 / 版本 / 导入导出 / 配置外观 / 触发设置）`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 草稿与 `graph` 双列分叉：`draft` 与 `graph` 是两个独立 json 列，官方同步路径只有 `publish`；同事务同时写两列的例外只有 `trigger-connection.change()` 与 `assistant-trigger.mutate()`，而 `hasConnectionDraftConflict` 只覆盖「触发节点」这一小块。任何旁路直写 json 列都会让两者分叉。
  - `ensurePrincipalUser` 隐式建账号：发布（`!xpert.userId` 时）、`POST :id/principal-user`、`:id/chat-api` / `:id/chat-app` 开关期都会创建 `thirdPartyId = xpert:<id>` 的通信用户；账号生命周期与 `app.enabled` 不绑定，**一旦创建不会随停用回收**。`updateChatApi` 先 `updateXpert` 再建账号，创建失败会留下「`api` 已落库但 `userId` 为空」的状态。
  - `update` 是浅层入口：`XpertService.update` 只转发 `updateXpert`，后者 `assign` + `super.save`；源码注释明写 `Isolate TypeORM's recursive update type; business callers use the shallow method to keep ts-node inference bounded`，即**不为递归关系（含 `OneToOne`）更新负责**，且没有类型层保护。
  - `publish` 是多步无事务：`saveTeamVersion`（备份版本行）与逐节点 `xpertAgentService.create/update/delete` 都发生在最终 `save` 之前，中途抛错**不回滚已创建的备份行与 agent**；只有触发器链有 `previousGraph` 反向重放。另外 `check()` 对游离节点/重名抛的是 `500` 而非 400。
  - `:id/configuration` 的 64 位 revision 乐观锁：`revision = sha256([xpert.updatedAt, draft, graph])`，格式必须是 `^[a-f0-9]{64}$`（DTO 层校验），不一致即 409 `AssistantConfigurationStale`；`save` 在 await 之后会重新 `load` 再比一次。注意该端点**会顺带执行一次 `publish(newVersion=true)`**，是唯一由配置页触发的发布入口（与 draft-only 取向相反）。
  - `trigger-settings`（编辑期）与 `trigger-connections`（运行期）不是一回事：前者是声明与校验（`list/validate/save`，revision = `sha256([graph, draft])`），后者是 QR 授权连接的落库与回滚；两者都能改同一批触发节点，靠 revision 与草稿冲突检测互相发现，**缺少统一领域服务**，命名也易检索错。
- **测试状态**：1 测试框架与运行方式（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
