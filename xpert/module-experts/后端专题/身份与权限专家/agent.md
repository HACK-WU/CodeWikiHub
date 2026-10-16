# 身份与权限专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/身份与权限专家/`
- **职责**：身份与权限专家回答两个问题：**请求是谁**（凭据 → principal）与**这个人能做什么**（角色 → 权限位），并维护「人—租户—组织」的归属关系。
- **子专家**：子专家①[组织与成员子专家](file://.module-experts/后端专题/身份与权限专家/sub-experts/组织与成员子专家/C0-使用总览.md) · 子专家②[角色与权限子专家](file://.module-experts/后端专题/身份与权限专家/sub-experts/角色与权限子专家/C0-使用总览.md) · 子专家③[认证与凭据子专家](file://.module-experts/后端专题/身份与权限专家/sub-experts/认证与凭据子专家/C0-使用总览.md)
- **覆盖目录**：
  - `server/src/auth`
  - `server/src/user`
  - `server/src/user-organization`
  - `server/src/user-group`
  - `server/src/role`
  - `server/src/role-permission`
  - `server/src/organization`
  - `server/src/organization-contact`
  - `server/src/employee`
  - `server/src/invite`
  - `server/src/api-key`
  - `server/src/secret-token`
  - `server/src/account-binding`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - guard 无注解即放行
  - CASL 未接线
  - 租户权限 guard 只剩骨架
  - 邀请接受端点完全公开
  - `invite/employee` 与文档不符
  - `PUT /api/invite` 行为异常
- **测试状态**：按目录口径实测：本域（`user/`…`password-reset/` 等 17 个模块目录）共 **24 个 spec**；若把判权直接相关的 `shared/guards/` 2 个 spec 计入则为 26 个。调研清单口径 27 个的差异来自是否把 `shared/`、`core/` 邻近 spec 计入，本文件按目录逐文件列明以便复核。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
