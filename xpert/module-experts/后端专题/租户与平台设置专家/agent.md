# 租户与平台设置专家 · 专家名片

> ⚠️ **重建说明**：本包于 2026-10-16 由 CodeBuddy 持久化产出重放重建（原基线 commit `c07bb83d`，仓库现为 `80f5676fd`）；**未在本机复跑 jest**，测试结论取自实现层 `06-测试.md` 与本文；复跑后可升级证据强度。

- **类型**：父专家
- **资产路径**：`.module-experts/后端专题/租户与平台设置专家/`
- **职责**：租户与平台设置专家回答三个问题：**租户从哪来**（创建 / onboarding / 子域与默认租户解析）、**这个租户或组织开没开某个能力**（feature 开关与组织级覆盖）、**这个租户怎么发信与返利**（自定义 SMTP、邮件模板、出站邮件、邀请码与返利关系）。
- **子专家**：无（本专家不拆子专家）
- **覆盖目录**：
  - `server/src/tenant`
  - `server/src/tenant-setting`
  - `server/src/feature`
  - `server/src/referral`
  - `server/src/custom-smtp`
  - `server/src/email`
  - `server/src/email-template`
- **高频坑（≤6，完整见 `C0-使用总览.md` 的已知问题）**：
  - 作用域必须显式化
  - 开关缓存靠版本号失效，而非逐 key 删除
  - `tenant_setting` 请求级缓存 TTL 5 分钟且写后不失效
  - 中间件只解码 JWT、不验签
  - 发信与模板都是多级回退，且每一级都做真实握手
  - 模板 `name` 由目录约定决定，改目录即改匹配键
- **测试状态**：本域共 12 个 spec，全部为**纯单元测试**：不使用 `@nestjs/testing`，不连数据库、不连 Redis、不起网络，均以 `new Service(...)` 手工注入普通对象 mock。12 个 spec 已逐文件通读，无 `it.skip` / `xdescribe` / `todo` / `only`，未发现已知失败。（本次未复跑，详见 `test/known-failures.md`）
- **何时用**：见 `C0-使用总览.md` 的「何时找」（改代码前请连带读 `C1-能力契约.md`）。
- **发现入口**：`.module-experts/INDEX.md` 与 `.module-experts/后端专题/T0-专题总览.md`。
