---
groupPath: 决策记录/运行时沙箱产物专家
relation: 可靠性-配额三桶租约与deadline
exportedAt: "2026-10-16T08:16:32.868Z"
---
【决策记录｜可靠性-配额三桶租约与 hardDeadline（三层闸门）】
- 分类：性能取舍（C5 §D5 原分类；本条按「可靠性」归口命名）
- 动机（避坑）：**现象** Agent 循环 ＋ 重试会在没有并发闸门的情况下同时起大量 NsJail 边界；只做单层限流又会被某个租户/用户吃满全局配额；**后果** 宿主内存/CPU 被击穿、失败集中在最贵的时刻，且「谁在占用」无法归因
- 决策：三层闸门 —— ① **作业层** Redis ZSET 租约三桶（`SANDBOX_JOB_GLOBAL_LIMIT=20`/`TENANT=4`/`USER=2`，匿名作业无 user 桶），Lua 原子同时占位，任一满即抛 `SandboxJobRuntimeError('SANDBOX_CAPACITY_UNAVAILABLE', …, retryable=true)`；② **注册表层**硬约束 `timeoutMs ≤ hardDeadlineMs`，作业行写 `hardDeadlineAt = now + definition.hardDeadlineMs`；③ **Runner 层**独立准入与 TTL（`MAX_RUNTIMES=100`、`MAX_EXECUTIONS_GLOBAL=32`/`PER_RUNTIME=4`、`MAX_TERMINALS_PER_RUNTIME=8`、`MAX_PROXIES_GLOBAL=64`、`PROXY_IDLE_TIMEOUT_SECONDS=60`、`MEMORY_BYTES=2147483648`、`SWAP_BYTES=0`、`PIDS=128`、`RLIMIT_AS_MB=4096`、空闲 2h / 硬租约 24h）
- 背景约束：容量桶泄漏表现为**永不放行**；`waitForCapacity` 会让请求在拿到 lease 前长时间挂住（对外表现为「长时间无响应」而非报错）；Runner 侧超限是**字面截断**（`MAX_SERVICE_LOG_BYTES`/`MAX_DOWNLOAD_BYTES`/`MAX_READY_TEXT_BYTES`）而非报错；`RUNTIME_IDLE_TTL_SECONDS=7200` **只回收运行时、不回收卷内文件**；`readyPattern` 名不副实（按字节限量并字面匹配，正则元字符无特殊语义）
- 背景约束（清理侧）：`cleanupOrphans` 每 60 秒扫 `hardDeadlineAt < now` 与 `cleanupPending`；`cleanupPending`/`cleanedAt` **只留证据、不自愈**（`requirePreviousAttemptCleanup` 拦住新尝试直到清理成功）；`SandboxService.cleanCron` 是空壳（仅打一行 debug 日志），API 挂掉期间无补偿
- 被否决方案：无（未见对「单层限流」或「无 TTL 长驻运行时」的显式否决记录）
- 重评条件：单机多租户密度提升、需要按组织配额或「预留＋抢占」语义，或要把容量释放从 Lua 租约换成可观测调度器时
- 关联代码：file://packages/server-ai/src/sandbox/sandbox-job/{sandbox-job-capacity.service.ts,sandbox-runtime-definition.registry.ts,sandbox-job.entity.ts,sandbox-job-runtime-capability.service.ts}、file://.deploy/nsjail-runner/docker-compose.nsjail.yml
- 证据来源：C5-关键决策.md §D5；implementation/{07-运维.md 五资源配额与准入全表, 02-实现.md 技术债与 hack 1, 05-接口.md 十四配额超限条}
- 详细资产：.module-experts/后端专题/运行时·沙箱·产物专家/ C5-关键决策.md §D5 · implementation/07-运维.md §五