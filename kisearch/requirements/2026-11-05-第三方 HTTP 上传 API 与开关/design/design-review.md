# 设计评审报告

> 需求：REQ-20261105-001
> 评审对象：`design/DESIGN.md` + `S01` / `S02` / `S03`
> 格式判定：design-craft（子文档命名匹配 + 父文档含一览图 mermaid + 共享术语速查）
> 评审日期：2026-11-05
> 流程：design-review（2 轮）→ challenger 二次质疑 → 场景推演

---

## 一、design-review 第 1 轮

### 🔴 阻断（2 项，已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| 1 | 一致性 | S-02 §3.4 | tar 分支的 `sourceDir` 定为 `<uploadId>/content/`，而 multipart 分支为 `<uploadId>/`，两者 group 推导与 `sourcePath` 必然不同 → `prune` 同源约束恒失配 | 新增 §3.4「会话目录的统一约定」，两分支统一落 `content/`，元数据放上层 |
| 2 | 正确性 | S-02 §3.5 | `uploadMaxBytes` 只约束**传输字节**，不约束 tar 解包后体积 → zip-bomb 可打满磁盘 | 新增三重闸门：条目数 ≤20k、解包总量 ≤ min(传输×10, 4GiB)、压缩比 >10 判可疑；超限 400 `OPEN_API_ARCHIVE_TOO_LARGE` + 清理 |

### 🟡 警告（7 项，已修复）

| # | 维度 | 位置 | 问题 | 修复 |
|---|---|---|---|---|
| 3 | 完整性 | S-02 §5 | 引用 `validateTree`（`safe-tar.ts:69` 私有未 export），影响范围未列 | §5 补 `export validateTree` + `export validateTarEntriesGeneric` |
| 4 | 完整性 | S-02 §3.7 | 未给 `createJob` / `runImportJob` 签名，也未说明 status 如何访问 `jobs` Map | §3.7 补四个符号的完整签名 + 新增 `getJobById` + 循环依赖检查结论 |
| 5 | 安全 | S-02 §3.8 | `GET /status` 未做跨任务鉴权 → 任意有效 token 可枚举他人任务 | 补「先取 job 的 scope 再校验」，越权 403 而非 404 |
| 6 | 正确性 | S-02 §3.3 | 未覆盖 RFC 5987 `filename*=UTF-8''`，中文文件名会变成百分号串 | 边界表新增 #3b：优先取 `filename*` 并解码，缺失才回退 `filename` |
| 7 | 质量 | S-02 §3.3 | `MultipartSink` 责任不清：`onFileStart` 返回 absPath，后续回调只给 relPath | 补责任划分注释：解析器不碰 fs；reject 时仍消费 body 到下一边界；sink 自维护 relPath→句柄映射 |
| 8 | 完整性 | S-03 §3.2 | 缺独立「接口设计」章节，CLI/配置/lock 三处契约散在方案章 | §3.2 改为「接口设计（CLI 契约 / 配置契约 / lock 契约）」+ 五条契约表 |
| 9 | 一致性 | S-01 §3.7 | 时序图写「合并 scopes + viewGrants」，易让实现者重复合并 | 补注：合并已发生在 `findTokenAuth` 内部（`mcp-token.ts:613-616`），S-01 不得二次合并 |

---

## 二、design-review 第 2 轮（增量再审）

### 🟡 警告（1 项，已修复）

| # | 位置 | 问题 | 修复 |
|---|---|---|---|
| 10 | S-02 §3.1 / §5 | open-api 内容落在 `content/`，而 `/api/import/prune` 的重扫假定 `<uploadId>/<rel>` → 一旦 open-api 触发 prune 候选计算，`scannedRels` 多一层 `content/`，token 恒失配 | §3.1 新增「刻意不支持的参数」声明（`pruneStale`/`pickMode`/`preserveRelPaths`/`skipDuplicates`/`onlyRelPaths`）；§5 补「`/api/import/prune` 不受影响」的显式说明 |

### 🟢 建议（2 项，已顺手处理）

| # | 位置 | 建议 | 处理 |
|---|---|---|---|
| 11 | S-01 §3.2 | 分发器 ctx 里透传 `createJob/runImportJob`，属 S-02 职责，会让 `mcp-http.ts` 理解 open-api 内部路由 | 已改为 handler 直接 import，ctx 只留 `resolveTokenAuth`/`uploadApi`/`uploadMaxBytes`/`config` |
| 12 | S-02 §3.2 vs §3.4 | 两个「目录结构」章节易混 | 保留（标题已区分为「目录结构」与「会话目录的统一约定」） |

**结论：0 阻断 / 0 警告，评审通过。**

---

## 三、challenger 二次质疑

质疑策略：feature（新能力）。聚焦「这个设计在真实使用中会不会坏」。

### 质疑 1：agent 重试上传会不会堆副本？ —— **成立，且本设计顺带解决了**

- 事实核查：`sourcePath` 在目录语义下取 `rel`（`src/lib/import.ts:1166`、`:1339`）；但**单文件语义下取绝对路径** `sourceDir`（`:2224`）。
- 若 `sourceDir` 是单个文件，uploadId 会进入 `sourcePath` → 每次重传都是新 sourcePath → **产生副本**。
- 本设计强制 `sourceDir = <uploadId>/content/`（永远是目录），因此**即使只传 1 个文件也走目录语义**，`sourcePath` 退化为文件名 → 重试幂等。
- 落地：已写入 S-02 §3.4 理由③，并注明这比现有 `/api` 单文件路径更稳。
- **状态：设计已覆盖，无需修改。**

### 质疑 2：daemon 重启后 status 返回 404，agent 分不清「任务丢了」和「没开始」 —— **成立**

- 现象：job 在进程内 Map，重启即丢；若直接 404，agent 的下一步动作完全不同（重试 vs 等待）。
- 修复：S-02 §3.8 补**三级回落**（内存 → 任务台账 1h → 任务日志 7d → 才 404），响应带 `source: memory|ledger|log`。
- **状态：已修复。**

### 质疑 3：tar 打包方式不同会导致 group 层级漂移 —— **成立**

- `tar czf - -C ./docs .` 与 `tar czf - docs/` 解包后 relPath 不同（后者多一层 `docs/`），group 全下沉一级。
- 修复：S-02 §3.5 补「打包方式约定」表 + 指出「打包根目录即知识库根」，文档必须给推荐命令。
- **状态：已修复。**

### 质疑 4：multipart 的 boundary 恰好出现在文件内容里 —— **已知限制，不修**

- 属 RFC 7578 固有风险；标准实现均为「首个匹配即切分」。客户端应选择足够随机的 boundary（curl 默认随机）。
- 结论：记为已知限制，不改设计。

### 质疑 5：两分支临时磁盘占用翻倍 —— **可接受**

- tar 分支峰值 = 包 + 解包内容（≤ 512MB + 4GiB）。解包完成即删包，失败 `finally` 清理整个 uploadId。
- 结论：可接受，已在 §3.5 显式标注。

---

## 四、场景推演

以执行者为入口走全流程（角色：Agent ×3 / 运维 / 并发场景）。

| # | 场景 | 走向 | 结果 |
|---|---|---|---|
| 1 | Agent 上传 30 个 md 的目录 | tar 流 → 校验 → 解包 → createJob → taskId → 轮询 → done | ✅ 通 |
| 2 | Agent 上传一份 5MB 大文档 | 单文件 → **默认 1MB 上限拒收** → 400 + 原因 | ❌ **发现问题 1** |
| 3 | 运维关闭上传 API | daemon 在跑 → 新参数命中幂等 exit → 无法生效 | ❌ **发现问题 2** |
| 4 | Agent 中途断网 | req aborted → 清理 uploadId → 重试 → 幂等覆盖 | ✅ 通 |
| 5 | 两个 Agent 同时导同一 scope | 第二个 job 在写锁上排队，`progress` 不动 | ❌ **发现问题 3** |
| 6 | Agent 重试同一目录 | 新 uploadId，但 `sourcePath = rel` 与 uploadId 无关 | ✅ 幂等 |

### 推演发现的问题（3 项，均已修入文档）

| # | 严重度 | 问题 | 修复 |
|---|---|---|---|
| 1 | 🟡 | 默认 `maxFileSize` 1MB 与「一份大文档」头号场景直接冲突，开箱即拒 | S-02 §3.6 补醒目提示：部署须调大；agent 上传前先 `GET /open/v1/ping` 读 `limits` 自检；超限响应须给实际值+上限值+调整方法 |
| 2 | 🟡 | daemon 在跑时无法用「带新参数启动」切换开关（幂等单例直接 exit）；`restart` 只沿旧 lock 值时永远关不掉 | S-03 补要求：`ki mcp restart` 必须透传 `--no-upload-api`，一条命令完成切换 |
| 3 | 🟡 | 并发导入时排队中的 job 与「卡住」不可区分，agent 会误判并取消/重提 | S-02 §3.8 补 `waitingForScopeLock` 字段 + `phase='waiting'`；job 创建即置位，拿到锁时翻转 |

---

## 五、评审统计

| 轮次 | 🔴 阻断 | 🟡 警告 | 🟢 建议 | 结论 |
|---|---|---|---|---|
| design-review 第 1 轮 | 2 | 7 | 0 | ❌ 不通过 |
| design-review 第 2 轮（增量） | 0 | 1 | 2 | ⚠️ 有条件通过 |
| challenger 二次质疑 | 0 | 3（成立并修复） | 1（已知限制） | 已处理 |
| 场景推演 | 0 | 3（成立并修复） | 0 | 已处理 |

**最终结论：✅ 通过**（全部 🔴 / 🟡 已修入文档；剩余 1 项为已知协议限制，不修）

## 六、遗留已知限制（不修，实施时需知）

| # | 限制 | 影响 | 处理 |
|---|---|---|---|
| L1 | multipart boundary 若出现在文件内容中会错切 | 极小概率，依赖客户端选随机 boundary | 文档建议用 curl 默认行为 |
| L2 | tar 分支峰值磁盘占用 = 包 + 解包内容 | 大包需预留 2 倍空间 | 已在上限中约束（≤512MB + 4GiB） |
| L3 | `jobs` 为进程内状态，重启后仅能靠台账/日志回溯 | 重启期间的实时进度不可见 | 三级回落已覆盖 |
| L4 | open-api 不提供清理（prune）能力 | 需要删过期文档时走 Web 导入页 | 见 S-02 §3.1 |
