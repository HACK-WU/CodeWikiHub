# 批次 B 二次质疑报告（Git URL 托管 clone）

- 对象：批次 B 未提交改动（新增功能：Git URL 数据源）
- 前置：`code-review-batchB.md` 结论 ✅（无 P0；1 P1 + 4 P2 已修复）
- 姿态：假设"已通过"仍有问题，按新增功能策略 + 数据守恒/全局回扣/搭车变更加压
- 时间：2026-10-22

## 一、质疑结论

| 等级 | 数量 | 说明 |
|---|---|---|
| 🔴 高 | 0 | 无阻断项 |
| 🟡 中 | 4 | 资源耗尽面、无取消、SSRF 信任边界、add 任务可诊断性 |
| 🟢 低 | 3 | 父级 symlink 的相对路径、CLI 控制字符、corrupt 登记的回收路径 |
| ✅ 不成立 | 6 | 见第四节 |

**裁决：可合入（中风险均为已知/接受项或已有文档），无高风险。**

## 二、中风险质疑

### Q1. 页面添加入口把"任意大小 clone"暴露给 API 调用者 🟡
- **推理链**：`POST /datasource/add-remote` 接受 `https://` URL → 服务端 `git clone` 全历史 → 导入预算（20k 文件/4GiB/300k chunks）在 clone **之后**才检查；10 分钟超时只限制时间，不限制磁盘。持有 scope token 的远程客户端可让 daemon 克隆超大仓库直到磁盘不足。
- **全局回扣**：目标是"页面可添加 Git URL"，但页面从"本地管理员操作"扩展为"远程 API 操作"后，资源消耗的信任边界变化。
- **现状**：与 CLI `git clone` 同信任级是设计 §6.1 的显式决策；失败会清理临时目录，不会登记。
- **建议（后续）**：增加仓库大小/对象数软上限（如 `git count-objects -vH` 在 clone 后、rename 前检查），或对页面入口默认 `--depth` 策略（会牺牲 diff 语义，需设计）。**本批不作为阻断。**

### Q2. clone 没有取消路径 🟡
- **推理链**：`cloneManagedRepo` 支持 `abortSignal` 与 `CLONE_CANCELLED`，但 HTTP/CLI 均未传入；10 分钟超时是唯一终止手段。用户误填大仓库后只能等。
- **影响**：任务页显示"克隆中"，无取消按钮；daemon 重启后临时目录最长保留 1 小时才清理。
- **建议**：后续把任务取消接到 `AbortController`；在此之前文档已说明 10 分钟超时与临时目录清理。

### Q3. SSRF / 内网访问信任边界 🟡
- **推理链**：页面允许填写任意 `https://host/path`，daemon 会主动连接该主机；具备 scope token 的调用者可探测内网 Git 服务。
- **现状**：设计 §6.1 明确"用户主动输入 URL，与 CLI 同信任级"；页面不收集凭据。
- **建议**：若未来 daemon 暴露到非可信网络，增加 host 白名单/私网地址拒绝开关。**当前部署为回环地址，风险可接受。**

### Q4. add 任务的可诊断性不足 🟡
- **推理链**：任务参数快照只有 `group`，不含 URL/branch/subdir；失败后用户在任务页只能看到错误码，无法确认"添加的是哪个仓库"。
- **影响**：多仓库排障成本上升；不影响数据正确性（登记成功后详情页完整可见）。
- **建议**：后续扩展 `TaskParamSnapshot`（URL 脱敏 + branch + subdir），或 add 任务详情直接关联 `scope` 的 datasource detail。

## 三、低风险质疑

### Q5. 父级 symlink 子目录的 `relativeRoot` 可能与真实路径不一致 🟢
- 例：仓库内 `a` 是 symlink → 仓库内 `b`，`--subdir a/c`。`realpath` 仍在仓库内（无越界，安全），但登记的 `relativeRoot=a/c` 与 git 路径不一致，`git diff` 可能不命中。
- 影响：极少数仓库布局下增量不同步；不越权、不丢已有文档。建议后续比较 `probeGit(dir).relativeRoot` 与输入，不一致即拒绝。

### Q6. CLI 非 TTY 时 clone 进度输出 `\r` 🟢
- 影响：CI 日志出现控制字符，不影响功能。建议 `process.stderr.isTTY ? '\r...' : 按 10% 换行`。

### Q7. 损坏登记的恢复路径 🟢
- 若 `datasource.json` 损坏：`scope delete` 读不到 managed 目录（不删 clone），`remove --purge` 因 `CORRUPT` 拒绝清理。
- 恢复：先 `ki scope delete <scope> --yes`（删除 KB/登记），再 `ki datasource remove --scope <scope> --purge --yes`（此时 NOT_FOUND，可清理遗留 clone）。已有路径，不需要 `rm -rf`。
- 建议：在文档中补一句恢复顺序。

## 四、不成立的质疑（含证据）

| # | 质疑 | 为何不成立 |
|---|---|---|
| F1 | 凭据会泄漏到 `.git/config` / 日志 | URL 校验拒绝 `user:pass@` 与查询串 token；`remoteUrl` 存储前 `sanitizeRemoteUrl`；错误经 `sanitizeGitError`；clone 根 0700 |
| F2 | add→首次 sync 会死锁 | 首次 sync 的 `submit` **不 await**，排在 add 任务之后；e2e 实测 add succeeded → sync full ok |
| F3 | 并发两个 add 会克隆两次/双登记 | `datasourceAddGates` + 台账 active 检查 + scope 锁内二次检查；新增并发用例 200/409 各一 |
| F4 | 登记失败会误删已有仓库 | 仅在本次 clone 成功且登记失败时 purge；clone 前已检查 `DATASOURCE_EXISTS`/`CLONE_TARGET_EXISTS`；purge 只允许 `<root>/<scope>` 深度 1 |
| F5 | `clean -fdx` 会删除用户文件 | 只对 `managed=true` 的托管副本执行；本地 Git 源仍 ff-only；文档明确"托管副本禁止手工修改" |
| F6 | `syncTaskId` 是死字段 | 生产方 add 任务写入，消费方 DataSourcePage 轮询读取；`normalizeResult` 保留 string/null，`null` 有独立文案 |

## 五、数据守恒与全局回扣

- **存量数据**：add-remote 只新增 `datasource.json`，不覆盖已有数据源；`DATASOURCE_EXISTS` 拒绝。首次同步 full 写入，commit 水位只在 ok 推进（已有测试）。🟰
- **异常归宿**：clone 失败 → 临时目录删除；登记失败 → clone 回收；首次 sync 入队失败 → add 成功 + `syncTaskId=null` + 恢复命令；purge 失败 → 路径写入 `cloneRemoveError`。无静默丢弃。
- **全局目标**：页面可添加远端源并首次同步（e2e 17 断言通过）；A 批次能力未回归（218/218 后端、512/512 web）。
- **搭车变更**：`runDatasourceSyncTask`/`datasourceSyncParams` 抽取、`OPERATION_LABEL`/`PHASE_LABEL` 补全、`kindForOperation` 登记、`scopeExists` 扩展。逐条做了等价性核对：同步行为的终态映射/参数/门禁释放与抽取前一致；标签为纯展示；`engine-only` 登记只放行读通道（clone 期间零元数据写）；`scopeExists` 与 `kiScopeList` 对齐。

## 六、建议行动

- **合入前**：无必须项。
- **合入后跟进**：Q1 仓库大小上限、Q2 取消接线、Q4 add 任务参数；Q5/Q6/Q7 可在相关模块下次改动时顺带处理。
