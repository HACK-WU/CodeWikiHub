# 🎯 设计文档质疑报告（知识视图）

- 对象：`design/DESIGN.md` + `S01`~`S06`
- 前序：`design/design-review.md`（已通过）
- 时间：2026-11-04
- 姿态：假设"已通过评审"仍有问题，对抗式取证

---

## 📋 设计上下文确认

| 项 | 内容 |
|---|---|
| 核心目标 | 多个 scope 可当作**一个逻辑单位**使用：读路径透明聚合，写路径保持"必须指定具体库" |
| 衡量标准 | `--scope <视图名>` 在全部读命令上等价于成员库的并集；写命令一律 fail-loud |
| 覆盖范围 | 视图定义（S-01）、检索（S-02）、写门禁（S-03）、鉴权（S-04）、顶栏+检索页（S-05）、浏览页（S-06） |
| 排除范围 | import / datasource / export / backup / wiki / chat / 嵌套 / 改名 / 页面创建 |
| 关键假设 | ① 单机、成员 ≤ 20 ② **视图仅 CLI 可改**（S-04 鉴权结论成立的前提）③ 视图不落磁盘实体 |
| 确认状态 | ⚠️ 假设 ② 的脆弱性未被充分处置（见意见 6） |

---

## ⚔️ 反对意见

### 意见 1：读工具族整组漏做 —— 需求 R-09 无子需求承接（🔴 致命）

- **反对理由**：设计只覆盖了 `ki search`（S-02）与 `/api/doc/list`（S-06）。但需求 `R-09` 明确要求 `group list` / `tag list` / `doc list` / `get-module-info` 也要按视图工作，**6 个子需求里没有任何一个承接它**。design-review 的范围缺口检查只做了文档内自洽，没有回对需求文档，所以漏掉了。
  更严重的是其中 **3 个是 MCP 工具**（`ki_group_list` / `ki_tag_list` / `ki_get_module_info`），直接暴露给 Agent。
- **代码证据**：
  - `src/group.ts:146,156` `ki group list --scope` → `buildListJson({ scope })` 读 `dataDir/<scope>/group-index.json`
  - `src/tag.ts:69` `ki tag list --scope` → `executeTagList({ scope })` → `vectorListTags({ scope })` 读 `collections/<scope>`
  - `src/doc.ts:174`、`src/get-module-info.ts:501` 同构
  - 三者都由 `resolveScope`（`src/lib/config.ts:948-963`）解析，**视图名会被当成真实 scope 直接传下去**
- **功能影响**：预期「视图下调用 `ki_group_list` 能看到三个库的合并目录树」→ 实际「读到 `dataDir/<视图名>` 不存在，返回空树或 `ENOENT` 报错」。Agent 侧会拿不到任何目录结构，进而无法定位文档——**视图对 Agent 的核心价值（一个名字定位全部知识）在这条路径上完全落空**。
- **严重程度**：🔴 致命
- **替代方案**：新增 **S-07 读工具族接入视图**（第 2 批，与 S-02/S-03/S-04 并行）：
  - `ki group list --scope <view>` → 逐成员取 `group-index`，输出按库分节（文本）或 `{ view, buckets:[{scope, groups}] }`（JSON）
  - `ki tag list --scope <view>` → 合并各成员 tag 并**累加计数**
  - `ki doc list --scope <view>` / `ki get-module-info` → 前者分桶，后者必须显式带 `--member`（否则按 `group+relation` 跨库唯一匹配，多命中即 fail-loud 让用户指定）
  - 三个 MCP 工具同步：`ki_group_list` / `ki_tag_list` 支持视图；`ki_get_module_info` 增可选 `member` 参数
- **验证方法**：建 2 库视图，`ki group list --scope <view> --json` 应返回 2 个 bucket；改造前会返回空或报错

### 意见 2：回滚/降级被锁死 —— 旧版本遇 `views` 直接起不来（🔴 致命）

- **反对理由**：`views` 放在 `config.yaml` 顶层（S-01 D1）。而 `config-schema.ts:10` 的校验策略是**「未知字段名 → 错误」**（不是告警）。一旦本版本上线、用户建了视图，**回滚到任何旧版本后，`loadConfig` 会因未知字段 `views` 抛 `CONFIG_FIELD_INVALID`，且是 fail-loud —— `ki` 全部命令不可用**，必须手工编辑配置删掉 `views` 段才能恢复。
  设计里没有任何一条覆盖这个路径。这不是理论风险：本项目的回滚方式就是换版本（daemon 还需 `ki mcp restart`）。
- **代码证据**：`src/lib/config-schema.ts:9-12`（校验策略注释）；专家包 `存储与配置基础专家/C0` 已知坑「启动报 `CONFIG_FIELD_INVALID`」
- **功能影响**：预期「回滚版本即可恢复服务」→ 实际「回滚后 `ki` 全命令报错，服务不可用，且错误文案只说字段非法，不提示'这是新版本字段，请删除'」
- **严重程度**：🔴 致命
- **替代方案（推荐，同时消解意见 5）**：**`views` 改存独立文件 `~/.ki/views.json`**（与 `mcp-tokens.json` 同模式）：
  - 回滚后旧版本**完全看不见**该文件 → 服务照常启动，视图功能静默失效（可接受，因为它只是读聚合）
  - 顺带解决 D1 没考虑的并发问题：独立文件可用 `withViewsLock`（抄 `mcp-token.ts:104-140` 的锁范式）
  - 代价：strict 白名单要读两处（`config.scopes` ∪ `views` 成员判定）；S-01 的 YAML 注释保留工作全部作废，换成锁 + 原子写，**净减工作量**
  - 次选（若坚持放配置）：在 `docs/` 写死「回滚前必须删除 `views` 段」并在 `ki doctor` 增加一项检查
- **验证方法**：建视图后回滚到上一版本，`ki scope list` 应正常返回

### 意见 3：SearchPage 的文档抽屉未传成员 scope（🔴 致命）

- **反对理由**：S-06 §3.6 已经识别出 `doc/get` 必须带成员 scope，并给了修复方案——**但它只覆盖了 BrowsePage 的 `ModuleDrawer`**。搜索结果卡片的点击同样会打开抽屉（`web/src/pages/SearchPage.tsx:740-754` 的 `openDocument`），而 S-05 §3.3 只改了来源标记与深链，**完全没有提抽屉正文**。
- **代码证据**：`SearchPage.tsx:740-754`（`openDocument({ module, content, group, path })`）；`BrowsePage.tsx:1229`（`ModuleDrawer scope=`）
- **功能影响**：预期「视图模式下点搜索结果，抽屉显示文档正文」→ 实际「抽屉的 scope 是顶栏的视图名，`doc/get` 读到 `dataDir/<视图名>` → **正文区域空白/报"原文不可用"**」。这是视图模式下**最高频的操作**（检索→看正文），失败率 100%。
- **严重程度**：🔴 致命
- **替代方案**：S-05 §3.3 补一节：`openDocument` 的 scope 传 `r.scope ?? scope`，与深链修复共用同一个 `docScope` 推导；`ModuleDrawer` 内 `useScopeReadonly` 同样取 `r.scope`
- **验证方法**：视图模式检索 → 点任一结果 → 抽屉正文非空

---

### 意见 4：所谓"无感"只对最终用户成立，对集成方不成立（🟡 重要）

- **反对理由**：需求原话是「感觉像 scope 组就是一个单独 scope 那样，对用户来说是无感的」。但设计实际给调用方增加了：`ki_scope_list` 新 `views[]`、搜索响应新 `matchedViews`/`scopes[]`、`/api/doc/list` 新 `buckets` 分支、`member` 参数、6 个新错误码、新 `mode` 概念。**对终端用户无感，对写脚本/接 MCP 的人有明显感知**。文档从头到尾没有承认这个落差，会让对接方按"零成本"预期排期。
- **功能影响**：预期「现有集成代码无需改动」→ 实际「想在视图下正确展示结果，必须处理 `buckets` 分支与 `matchedViews`」
- **严重程度**：🟡 重要
- **替代方案**：父文档 §1 增加「**兼容性承诺与落差声明**」：终端用户零感知；CLI/MCP 调用方在**单库模式下行为逐字节不变**（这是硬承诺，已有验收 B4/E2/F6 兜底）；视图模式属新增路径，需按新契约处理
- **验证方法**：审阅父文档是否有该声明

### 意见 5：`writeViewInConfigFile` 无文件锁，并发丢更新（🟡 重要）

- **反对理由**：S-01 §3.4 抄了 `setScopeReadonlyInConfigFile` 的范式，但那个函数**本身就没有文件锁**——`atomicWriteConfig` 只防"半写"，不防"两个进程各自读旧文件再覆盖"。`ki view add a` 与 `ki view add b` 并发 → 只有一个生效。项目已把同类问题登记为 P1（Token 存储无锁）。
- **功能影响**：预期「两次 add 后视图有 3 个成员」→ 实际「只剩 2 个，且无任何报错」
- **严重程度**：🟡 重要
- **替代方案**：随意见 2 改用独立文件 + `withViewsLock`（`mcp-token.ts:104-140` 范式，5s 超时 / 30s 陈旧抢占）；若留在配置文件，至少加 `wx` 锁文件包住读-改-写
- **验证方法**：并发起 10 个 `ki view add`，成员数应为 10

### 意见 6：token 视图授权应独立成字段，避免将来二次迁移（🟡 重要）

- **反对理由**：S-04 D2 选"动态跟随"，全部安全性押在"视图仅 CLI 可改 ≈ 管理员"这一个前提上。用户原话是「页面上**暂时**不支持创建视图」——"暂时"意味着这个前提**已被计划推翻**。届时 S-04 的结论失效，`token.scopes` 里混着视图名与库名的现状**无法区分**（一个字符串可能是库也可能曾经是视图），迁移只能靠猜。
- **功能影响**：预期「将来开放页面编辑视图时，只需放开 UI」→ 实际「必须做一次 token 存储迁移 + 鉴权语义迁移，且历史数据无法自动判定哪些条目是视图授权」
- **严重程度**：🟡 重要
- **替代方案**：`TokenRecord` 增 `viewGrants?: string[]`，与 `scopes` 并列。鉴权时两者都展开。好处：① 类型上就区分了客体种类，审计与迁移都确定 ② 将来切回"授权快照"只需把 `viewGrants` 换成展开后的 `scopes` ③ 增量成本约 20 行
- **验证方法**：`ki mcp token list` 能区分「知识库授权」与「视图授权」两类条目

### 意见 7：strict 模式应禁止创建含不存在成员的视图（🟡 重要）

- **反对理由**：S-01 D4 允许成员暂不存在（前向声明），理由是"与 default 模式的自动创建哲学一致"。但 `strict` 模式的**存在意义就是防拼错**——在 strict 下允许 `ki view create team --members typo-name`，等于给拼写错误开了一个静默通道，而这个错误要到检索时表现为"少了一个库"才被发现。
- **功能影响**：预期「strict 下拼错的库名被立刻拒绝」→ 实际「创建成功，检索时该成员静默 skipped，用户以为视图覆盖了 3 个库其实只有 2 个」
- **严重程度**：🟡 重要
- **替代方案**：`validateViewMembers` 增加配置上下文判定：`scopeMode==='strict'` 时成员必须 ∈ `config.scopes`，否则 `VIEW_MEMBER_NOT_REGISTERED`
- **验证方法**：strict 配置下 `ki view create t --members nope` 应失败

### 意见 8：自引用检查需显式写死（🟡 重要）

- **反对理由**：`ki view create team --members team` 时，`team` **尚未存在**，`isViewName(config,'team')` 为 `false`，若成员校验只判"是否是视图"，**自引用会被放行**——随后 `resolveScopeTargets` 展开 `team → [team]` 无限循环（或深度耗尽）。S-01 的签名里带 `selfName?` 参数，但 §3.1 字段规则只写"每项不得是视图名"，没有写"必须排除 selfName"。
- **功能影响**：预期「自引用被拒绝」→ 实际「创建成功，检索时栈溢出或无限展开」
- **严重程度**：🟡 重要
- **替代方案**：§3.1 规则补一行「成员 ∉ `{selfName}` ∪ 全部视图名」；验收补 `ki view create t --members t` 必须失败
- **验证方法**：见上

### 意见 9：`ki scope list` 文本输出变更会打断脚本（🟡 重要）

- **反对理由**：S-04 §3.6 让 `ki scope list` 追加一段"视图"。项目里 `ki scope list` 是**给人和脚本共用的**（`docs/query-kb.md:58` 就教用户"`ki scope list` 看该 scope 是否在 KB/向量层存在"）。追加段落会破坏按行解析的脚本。
- **功能影响**：预期「升级后脚本照常工作」→ 实际「`grep`/`awk` 类脚本把视图行当成 scope 行，拿到错误列表」
- **严重程度**：🟡 重要
- **替代方案**：文本输出默认**不追加**视图（保持原样），`--views` 显式开启；`--json` 始终包含 `views`
- **验证方法**：`ki scope list` 默认输出与升级前逐字节一致

---

### 🟢 建议

**意见 10：通配 scope 替代方案未论证**。`--scope 'team-*'` 能覆盖大部分"想看一组库"的场景且零新概念。否决理由应当写明（通配会让**未来新建的库自动进入集合**，权限与结果集都不确定），否则将来有人会问"为什么不用通配"。

**意见 11：视图展开缺可观测性**。5 库与 20 库视图的检索耗时差异、各成员召回数分布，设计里没有任何日志或指标。出问题时无法判断"慢在展开还是慢在 fan-out"。

---

## ✅ 认可点

1. **单点展开 + 下游只认真实 scope** 的架构选择是对的，把"视图"约束在一个函数里，未来加读接口几乎零成本。
2. **写路径挂在 `withScopeLock` 一处**而不是逐命令，避免了 `BLOCKED_OPS` 那类登记表漂移的老问题。
3. **主动识别 `doc/get` 静默读空**，并给出「`docScope` 为 null 时不发请求」的处理——这个细节很多设计会漏。
4. 鉴权传输层**零改动**的判断是准确的（`scopes.includes(name)` 天然成立），避免了无谓的改动面。

---

## ➕ 补充场景

| 场景 | 现状设计 |
|---|---|
| 视图成员是 `default` | 允许（`default` 是合法 scope，只是不能作视图名）——文档未明说，建议 §3.1 写明 |
| 视图模式下 `ki doc list` | **未覆盖**（见意见 1） |
| 旧版前端手工改 URL 到 `?scope=<view>` | 不认 `buckets`，页面空白——可接受（旧前端无视图入口），建议在父文档"兼容性声明"里带一句 |
| 视图被删除后，前端 localStorage 仍指向它 | S-05 §3.2 已覆盖（兜底项 + 已失效标记）✅ |
| `ki view create` 时配置文件是只读/磁盘满 | `WRITE_FAILED`，但文档未说明此时**视图是否已部分写入**（原子写应保证不部分写入）——建议验收补一条 |
| 同一视图被两个不同 token 授权，其中一个只读 | 只读是 token 维度（`readOnly`），与视图无关，无需处理 ✅ |

---

## 📊 风险评估与建议

### 🎯 裁决结论

**⚠️ 修改 🔴/🟡 意见后进入开发**

理由：3 条 🔴 里有 2 条会导致**功能完全不可用**（读工具族、搜索抽屉），1 条会导致**回滚即停服**。这三条都不是"实现时注意"能兜住的，必须在设计里补。

### 风险等级

- **总体风险**：🔴 高风险
- **分布**：🔴 3 / 🟡 6 / 🟢 2

| 风险 | 可能性 | 功能影响 |
|---|---|---|
| 读工具族未覆盖 | 必然（设计缺失） | 视图下 `ki_group_list` 等返回空/报错，Agent 无法定位文档 |
| 回滚停服 | 中（回滚是常规运维动作） | 回滚后 `ki` 全命令 fail-loud |
| 搜索抽屉空白 | 必然 | 视图下"检索→看正文"100% 失败 |
| 并发丢更新 | 低（视图改动不频繁） | 成员静默丢失 |
| strict 拼错放行 | 中 | 视图覆盖面被静默缩小 |

### 行动建议

#### 必须处理（🔴）
1. **新增 S-07 读工具族接入视图** —— 否则视图对 Agent 的价值在 `ki_group_list` / `ki_tag_list` / `ki_get_module_info` 三条路径上完全落空（意见 1）
2. **`views` 改存 `~/.ki/views.json`**（推荐）或在文档与 `ki doctor` 中固化"回滚前删 `views`" —— 否则一次回滚就停服（意见 2），顺带解决并发（意见 5）
3. **S-05 补 `openDocument` 的成员 scope** —— 否则视图下最高频操作必然失败（意见 3）

#### 建议处理（🟡）
1. 父文档补「兼容性承诺与落差声明」（意见 4）
2. `writeViewInConfigFile` 加锁（意见 5，随行动 2 一并解决）
3. `TokenRecord` 增 `viewGrants` 字段（意见 6）
4. strict 下成员必须已注册（意见 7）
5. 自引用检查显式写死（意见 8）
6. `ki scope list` 文本输出默认不变（意见 9）

#### 可选处理（🟢）
1. 父文档补"为何不用通配 scope"的论证（意见 10）
2. 视图展开加一行耗时日志（意见 11）

---

## 🔧 处置记录（2026-11-04，用户确认全部采纳）

| 意见 | 严重度 | 处置 | 落点 |
|---|---|---|---|
| 1 读工具族漏做 | 🔴 | **新增 S-07**（4 命令 + 3 MCP 工具 + 新建 `src/lib/doc-list.ts`） | `S07_读工具族接入视图_DESIGN.md` |
| 2 回滚停服 | 🔴 | `views` **迁独立文件 `~/.ki/views.json`**（含 `withViewsLock`） | DESIGN §3.2、S-01 D1、A9/A15/A16 |
| 3 搜索抽屉空白 | 🔴 | S-05 新增 §3.3b：`openDocument` 传 `hitScope`，`useScopeReadonly` 改走 `memberMeta` | S-05 E10/E11/E12 |
| 4 "无感"落差 | 🟡 | 父文档新增 **§1.1 兼容性承诺与落差声明**（三档） | DESIGN §1.1 |
| 5 并发丢更新 | 🟡 | 随意见 2 一并解决（`withViewsLock`） | S-01 §3.4、A14 |
| 6 token 授权需可分迁移 | 🟡 | `TokenRecord.viewGrants` **独立字段** + 加载时合并（下游零改动）+ `--view` 显式授权 | S-04 §3.1/§3.2、D1/D1-b/D6 |
| 7 strict 允许拼错 | 🟡 | 新增 **D4-v2**：strict 下成员必须已注册（`VIEW_MEMBER_NOT_REGISTERED`） | S-01 D4-v2、A13 |
| 8 自引用未写死 | 🟡 | `validateViewMembers(config, members, selfName)` 显式排除自身 | S-01 §3.3、A5b |
| 9 `ki scope list` 打断脚本 | 🟡 | 文本输出**逐字节不变**，`--views` 才追加；`--json` 始终含 | S-04 §3.8、D5、D12 |
| 10 通配未论证 | 🟢 | 父文档新增 §1.3「为何不用通配 scope」 | DESIGN §1.3 |
| 11 展开不可观测 | 🟢 | 视图检索输出 `[view] team → 5 个成员（展开 3ms，跳过 1）` | S-02 B13 |

### 额外修复（评审外发现）

| 问题 | 处置 |
|---|---|
| **S-03 与 S-04 同批争 `src/scope.ts`** | S-03 §3.2 挂点表移除 `src/scope.ts`（`scope-delete`/`scope-clear` 经写锁已覆盖；`scope-readonly` 交给 S-04 §3.9） |
| **批次 3 与 `ki.css` / `lastView.ts` 冲突** | 批次 3 改**串行**（S-05 → S-06）；`hooks.ts` 的 `useViewMemberReadonly` 归 S-05 建、S-06 消费 |
| **strict 免注册与 strict 语义冲突** | 取消"视图成员免注册"特权，展开后成员与普通 scope 同权（S-02 D2 重写） |
| **浏览页跨库键不唯一**（用户追问发现） | S-06 新增 §3.8：全部内部键改 `(scope, group)` 复合键 + 统一 `BrowseHit` 模型 |
| placeholder「搜索全库文档」在视图下误导 | 视图模式改「搜索视图内全部文档…」（S-06 §3.5、D11、F23） |

**复评结论**：v2 文档已覆盖全部 3 条致命与 6 条重要意见，可进入开发。
