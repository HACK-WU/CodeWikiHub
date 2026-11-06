# 批次 B 代码审查报告（Git URL 托管 clone）

- 审查对象：批次 B 未提交改动（S-05），基线 `master@d10c653` + 工作区
- 关联需求：REQ-20261021-003《数据源 Git 增量同步与页面操作》
- 审查方式：`code-review`（七维度）+ 独立子 agent 复核 + `challenger` 二次质疑
- 审查时间：2026-10-22
- 结论性质：**已验证**（实跑测试与端到端脚本，不只是静态阅读）

## 1. 全局图景

- 业务目标：页面可登记一个 Git 仓库 URL 并同步；本地目录仍走 CLI；普通目录限频不变。
- 系统位置：
  `DataSourcePage 表单 → POST /datasource/add-remote → [scope 锁] cloneManagedRepo → addDataSource → 首次 datasource-sync（full）→ datasource.json / 任务台账`
  生命周期：`remove --purge` / `scope delete` → `purgeManagedCloneDir`。
- 整体成功判据（必须保持）：
  1. 本地目录与本地 Git 源行为不变（ff-only、限频、候选/水位语义）。
  2. 托管 clone 只能落在 `<cloneRoot>/<scope>/repo`，不得读取 clone 外宿主机文件。
  3. 凭据不落盘、不进入日志；危险 URL/传输被拒。
  4. clone 失败不留半成品；登记失败回收 clone；删除路径不误删无关目录。
  5. 首次同步必为 full；commit 水位只在 `state=ok` 推进。

## 2. 维度评分

| 维度 | 评分 | 状态 | 主要依据 |
|---|---|---|---|
| 语义一致性 | 9/10 | ✅ | 首次 full、增量 changed=1、水位推进均实测；任务 mode 与执行一致 |
| 安全性 | 9/10 | ✅ | URL 白名单、凭据/查询串 token 拒绝、`ext::` 拒绝、symlink 子目录逃逸已修 |
| Bug 风险 | 9/10 | ✅ | 并发 add 仅 1 任务；失败零残留；scope delete 仅删精确托管目录 |
| 代码规范 | 9/10 | ✅ | `execFile` + `--` + 超时 + 禁交互；错误码可判别 |
| 架构设计 | 8/10 | ✅ | clone/登记/同步分层清晰；add→sync 两任务解耦，未引入循环依赖 |
| 性能 | 8/10 | ✅ | clone 期间零元数据写，登记 `engine-only` 不阻塞读；失败快速返回 |
| 测试覆盖 | 9/10 | ✅ | 新增 5 套相关测试 + CLI/页面 e2e，覆盖安全/失败/生命周期 |

## 3. 问题与处置

### P0（阻断）
无。

### P1（已修复）
1. **`--subdir` 为 symlink 时可指向仓库外宿主机目录**
   - 位置：`src/lib/datasource-clone.ts`（clone 后子目录校验）
   - 影响：仓库可控内容可把宿主机任意目录当成导入源。
   - 修复：`lstat` 拒绝 symlink 子目录 + `realpath(dir)` 必须仍位于 clone 内。
   - 回归：`test/datasource-clone.test.ts`（symlink 子目录 → `INVALID_SUBDIR`，14/14）。

### P2（本轮修复）
2. **查询串凭据未被拒绝**：`https://host/repo?access_token=...` 会被 git 使用并原样持久化到 `git.remoteUrl`。
   - 修复：`validateGitUrl` 拒绝 `token/access_token/private_token/secret/api_key/...` 查询参数，返回 `GIT_URL_CREDENTIALS`。
   - 回归：`datasource-clone-url` 12/12。
3. **`remove --purge` 掩盖损坏登记**：原先 `readDataSource` 任何失败都会走遗留清理，`CORRUPT` 错误被吞。
   - 修复：仅 `NOT_FOUND` 走遗留清理；`CORRUPT` 原样报错。
4. **`scopeExists` 与 `kiScopeList` 判据不一致**：纯向量 scope 在页面可选、提交却被 400。
   - 修复：判据扩展为 config ∪ KB 目录 ∪ `vectorDir/collections/<scope>`；新增 mcp-http-api 用例。
5. **branch/subdir 未归一化**：`--branch ''/带空格` 会让 `remoteBranch` 写成空串或 clone 失败信息混乱。
   - 修复：`addRemoteDataSource` 内统一 `trim`，clone/登记/remoteBranch 使用同一归一值。

### P2（已知限制，不阻塞）
6. add 任务的参数快照仅记录 Group，不含 URL/分支/子目录（登记完成后详情页完整可见）。
7. clone 未接取消按钮（`abortSignal`/`CLONE_CANCELLED` 已就绪，未从任务页接线）；10 分钟超时后临时目录在 1h 后被清理。
8. 父级 symlink 子目录可能使 `relativeRoot` 与真实路径不完全一致（realpath 仍在仓库内，无越界；git diff 可能不命中）。
9. CLI 非 TTY 时 clone 进度使用 `\r`（日志中会出现控制字符）。

## 4. 数据守恒与新增数据

| 数据 | 流向 | 数量/内容 | 异常归宿 | 判定 |
|---|---|---|---|---|
| `datasource.json` | 新增记录，不覆盖已有（`DATASOURCE_EXISTS`） | 原子写、0600 | 登记失败回收 clone；回收失败返回 `cleanupWarning` | ✅ |
| `lastSync.git.commit` | 首同步 full 后写入 | 仅 `state=ok` 推进 | partial/cancel/fail 保持旧值 | ✅ |
| `TaskResultSnapshot.syncTaskId` | add 任务 → 页面轮询消费 | `null` 表示入队失败，add 仍成功 | 台账 `normalizeResult` 保留 string/null | ✅ |
| 托管目录 | `<cloneRoot>/<scope>/repo` | 失败零残留；过期 tmp 1h 清理 | `remove --purge` / `scope delete` / orphan 清理 | ✅ |

## 5. 验证证据（最终）

- 后端定向：clone-url **12/12**、clone **14/14**、git-probe 10/10、model 5/5、policy 7/7、runtime 4/4、sync-incremental 11/11、sync-managed **2/2**、scope-doc **20/20**、fts-only 2/2、import-prune 27/27、import-prune-api 12/12、task-registry 6/6、task-snapshot 13/13、coordinator-read-lane 13/13、mcp-http-api **60/60** = **218/218**。
- Web：**512/512**；`tsc --noEmit` 0；`npm run build` ✓。
- 后端 `tsc -p tsconfig.json --noEmit`：仅既有 2 条基线（`import-budget.ts` / `mcp-http.ts`）。
- CLI 端到端 **24 assertions**；页面 e2e **17 assertions**；`git diff --check` clean。

## 6. 合入结论

**✅ 可直接合入（无 P0；P1 已修复；P2 已修 4 项，遗留 4 项为已知限制）。**

> ⚠️ 当前 7423 daemon（pid 2733694）加载的是本轮审查修复**之前**的后端代码；查询串凭据拒绝、CORRUPT 处理、scopeExists 对齐、branch/subdir 归一化需重启 daemon 后生效。web bundle 无变化。
