---
groupPath: 决策记录/运行时沙箱产物专家
relation: 架构设计-NsJail执行后端与元数据包拆分
exportedAt: "2026-10-16T08:16:32.867Z"
---
【决策记录｜架构设计-NsJail 唯一隔离后端 ＋「元数据包 / .deploy 实现」拆分】
- 分类：架构设计
- 动机（避坑）：**现象** ① 把用户可控命令放在 API 进程内（Local Shell）或普通容器里跑 —— 没有命名空间、只读 rootfs、`NO_NEW_PRIVS`、capability dropping、seccomp 与 cgroup 的资源/权限边界，可执行文件的构造面暴露给请求方；② 把 Runner 当普通 workspace 包（`packages/nsjail-runner`）维护与发布 —— 镜像构建/部署步骤与代码位置失配，升级顺序无人约束，出现「API 比 Runner 新」的静默不兼容（协议能力位不足时 `create()` 直接失败）
- 决策：隔离后端收口为策略注册表内的 nsjail 实现（`@SandboxProviderStrategy('nsjail')` ＋ `@SandboxWorkspaceMapperStrategy('nsjail')`），执行落到**唯一特权组件** Runner（独立容器、HTTP 协议），每个 execute/终端/托管服务各得独立 NsJail 进程边界；`packages/nsjail-runner/package.json` 只作**发布元数据**（`private: true`，description「Release metadata for the Xpert NsJail runner Docker image」），真实 runner（`runner.py` ＋ `network.py`/`net_proxy.py`/`seccomp.policy`）与 `Dockerfile` 留在 **`.deploy/nsjail-runner/`**，API 侧只保留协议校验与适配（provider/sandbox/runner client/types）
- 背景约束：Runner 侧 `privileged: true` ＋ `apparmor=unconfined` ＋ `cgroup: host` ＋ `/sys/fs/cgroup:rw`；**RPC 请求不能选择挂载、宿主 PID、NsJail 参数或可执行文件**；工作区路径必须解析在 `XPERT_NSJAIL_WORKSPACE_ROOT` 之下；cgroup v2 不可写时 Runner **fail fast** 而非降级（dev/宿主模式 `XPERT_NSJAIL_USE_CGROUP_V2=false` 只跑 rlimit，Docker Desktop 结果不构成 native Linux 证据）；配好 `NSJAIL_RUNNER_URL`/`TOKEN` 后 Local Shell **fail-closed 关闭**，`LocalBrowserRuntimeProvider` 仅开发
- 背景约束（协议与升级）：协议常量 `NSJAIL_RUNNER_PROJECT_CONTENT_PROTOCOL_VERSION = 2`（项目态校验）与 `NSJAIL_RUNNER_APP_DATA_PROTOCOL_VERSION = 3`（所有运行时）是硬门槛；升级顺序被文档钉死为「**先镜像后 API**」且 API 拒绝更旧 Runner；镜像固定 `xpert-nsjail-runner:3.6` 且 `NSJAIL_COMMIT` 在 clone 后校验哈希（漂移即构建失败）；回滚要**成对**取消 `NSJAIL_RUNNER_URL`/`NSJAIL_RUNNER_TOKEN`，否则 provider 半可见
- 被否决方案：无（实现层未见对「docker / 进程内子进程作为隔离后端」或「Runner 作为 workspace 包随 API 发布」的显式否决记录）；`[推测]` 未选容器直连的动因是把特权面收敛到单一组件、并让执行后端与 API 生命周期解耦
- 重评条件：需要远程/共享 Runner、要把 `privileged` 收窄为能力/设备白名单、或要在 Docker Desktop 等非真实 Linux 宿主上跑生产时
- 关联代码：file://packages/server-ai/src/sandbox/nsjail/{nsjail-sandbox.provider.ts,nsjail-sandbox.ts,nsjail.types.ts,nsjail-runner.client.ts}、file://packages/nsjail-runner/package.json、file://.deploy/nsjail-runner/{Dockerfile,docker-compose.nsjail.yml,README.md}
- 证据来源：C5-关键决策.md §D1/§D2；implementation/{01-架构.md 关键不变量 1 与执行后端归属段, 07-运维.md 二/三/七}
- 详细资产：.module-experts/后端专题/运行时·沙箱·产物专家/ C5-关键决策.md §D1~D2 · .deploy/nsjail-runner/README.md