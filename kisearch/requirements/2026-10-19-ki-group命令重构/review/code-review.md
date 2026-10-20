# 代码审查报告：ki group 命令重构（实现）

> 审查时间：2026-10-19
> 审查对象：工作区未提交改动（57 文件，`master@fb6a5da` + dirty）
> 审查方式：code-review（语义一致性 / 安全 / Bug / 规范 / 架构 / 性能 / 测试）+ 实跑验证
> 结论：**⚠️ 修复 4 个问题后通过**（均已在本轮修复并复跑测试）

---

## 1. 语义一致性问题（已修复）

| # | 位置 | 问题 | 影响 | 修复 |
|---|---|---|---|---|
| S1 | `src/lib/group-delete.ts` `resolveExactGroupPath` / `candidatePaths` / `planGroupDelete` | 使用 `readGroupIndex` 读取树；该函数在 legacy `roots` 格式下会**自动迁移并写回**，导致"预览零写入"承诺失效 | 预览命令可能修改磁盘 | 改为纯 `readJson`；仅在 `executeLocal`（写锁内）调用一次 `readGroupIndex` 完成迁移 |
| S2 | `src/lib/group-delete.ts` `computeEmptyParents` | 计算祖先是否为空时把**目标子树自身**当成"其他路径"，导致预览的 `emptyParents` 恒为空 | 预览与实际清理不一致 | 排除 `target` 及其子树后再判断 |
| S3 | `src/group.ts` `collectGroupPaths` | `--json` 只取 relations 分片键，**只有树、没有 relation 的组不会出现** | `ki group list --json` 漏组（实跑发现） | 合并 group-index 树路径 ∪ relations 键 |
| S4 | `src/lib/group-create.ts` | 锁冲突错误只返回 message，无 `SCOPE_OPERATION_BUSY` code | 验收 M-06 无法判定 | catch 中按 message 补 `code` |

## 2. 其他问题（已修复）

- `src/lib/mcp-tools/group-list.ts` 描述仍写"词云"（该能力早已移除）→ 已改为"Group 树 + Relations，支持分区与语义兜底"。
- `bin/ki.mjs` 头部示例仍为旧命令 → 已更新。
- `docs/manage-index.md` 整篇为旧命令 → 重命名为 `docs/group.md` 并重写。
- 旧测试 `manage-index.test.ts` 已删除并由 `group-create.test.ts` / `group-cli.test.ts` 取代。

## 3. 安全与护栏核查

| 检查点 | 结论 | 证据 |
|---|---|---|
| 删组不写 `source.dir` / wiki | ✅ | `group-delete.ts` 只读 `getSource` 生成 `willKeep`；测试断言源文件仍在 |
| 文档级硬删 containment | ✅ | `unlinkWithinSourceDir` realpath 前缀校验；新增软链逃逸测试 |
| 源文件归属校验 | ✅ | `sourcePath` 不符 → `source-mismatch` |
| 单一删组 core | ✅ | 旧符号 grep 为 0；MCP `delete_empty` 复用同一 core |
| 写锁 / 迁移守卫 | ✅ | 两 core 均包 `withScopeWriteLock` + `assertNoPendingVectorMigration` |
| 路径穿越 | ✅ | `normalizeGroupPath` 拒绝 `.` / `..` / 空段 / 反斜杠 / NUL |

## 4. 实跑验证

- `npx tsc -p tsconfig.src.json --noEmit` → 0
- 13 个测试文件：148 pass / 0 fail
- 真实 CLI（临时 config）：create / delete 预览与执行 / list --json / RENAMED / 漏 `-r` 报错
- 真实 MCP（daemon）：create / list / delete_empty / 非空拒绝 / `ki_scope_list.topGroups`

## 5. 残留

- M-09「迁移中」错误出口未实测（非阻断）。
- M-10 文档样例未做逐字段 diff（非阻断）。

---

## 6. 真实验收阶段追加发现（2026-10-19，daemon 重启后）

| # | 问题 | 证据 | 修复 |
|---|---|---|---|
| R1 | 删组只删 relation 内容向量，**未删 `ki-path` 路径向量**；搜索仍能命中已删除组 | 真实 daemon：删 `验收` 后 `search "告警"` 返回 `content:"验收 wiki", group:"验收/wiki"` | 按 `generateDocId(buildGroupPathContent(group), scope, 'ki-path')` 重算并加入删除集合 |
| R2 | 文档级硬删用 `findWikiFile` 按 `<group>/<relation>.md` 定位；平铺导入的真实 `sourcePath` 是 `a.md`，导致找不到文件 | 真实 daemon：平铺导入后 `delete-relation` 返回 `file-not-found`，源文件未删 | 优先用 `rel.sourcePath` 定位；缺失时回退命名约定；两者都存在但不一致时报 `source-mismatch` |
| R3 | 验收报告指标 M-08 只覆盖磁盘，未覆盖向量层 | 删组后 `doc list` 仍剩 2 条 `ki-relation` | 记录为「已知残留」：`ki-relation` docId 跨组共享，按 id 删会误删他组；需持久化辅助 id 或加 group 元数据 |

复跑：`tsc` 0；`delete-group` 7/7、`delete-relation-wiki` 4/4、`group-create` 7/7、`group-cli` 5/5、`integration` 10/10、`error-handling` 15/15。

---

## 7. 第二轮审查（2026-10-20，auto-review · 针对 K-01~K-04 修复）

> 对象：`6131808` 之上的工作区改动（7 文件，+438/−41）。整体评分 **A**（7 维均值 8.9，无未修复 P0）。
> 关联质疑：`review/code-challenge-report.md`（challenger 二次质疑，1 🔴 已在审查内修复）。

### 7.1 结论

上一轮登记的三条「已知残留」中的两条（R3 的 `ki-relation` 幽灵、K-02 的 `ki-path` 开关）在本轮被解决，且**不需要改存储格式** —— 向量层的 `group` 早已是可过滤的已索引标量字段。

### 7.2 维度评分

| 维度 | 分数 | 说明 |
|---|---|---|
| 🔑 语义一致性 | 9 | 注释与实现一致；预览 hint 补「共享向量会保留」消除新的预期落差 |
| ⚠️ 安全性 | 9 | filter 值经 `renderValue` 转义，字段受白名单约束；无新增外部输入面 |
| 🐛 Bug 风险 | 8 | 审查内生并修复 3 处（截断静默、初始化语义回退、扫描失败未兜底） |
| 📐 代码规范 | 9 | 顺带修掉 TS2456 自引用类型与 Promise 返回类型（root `tsc` 恢复 2 条既有错误） |
| 🏗️ 架构设计 | 9 | 枚举能力下沉 vector-client，业务保护留在 group-delete，依赖方向正确 |
| ⚡ 性能 | 9 | `ai-docs`（634 组 / 15.5k 内容向量）全量引用扫描实测 **30ms**；纯树删除短路跳过扫描 |
| 🧪 测试覆盖 | 8 | 新增 7 例；真引擎 filter 契约仍靠人工 e2e（登记跟进） |

### 7.3 审查内修复

| # | 问题 | 级别 | 修复 |
|---|---|---|---|
| R4 | `listIds` 无 offset 分页，命中顶到 limit 时**静默截断** → 会把「没枚举完」当「无残留」 | 🔴 | 返回 `{ docs, truncated }`，截断即 warning；新增用例 |
| R5 | 为修 K-03 曾把「scope 是否初始化」改成 `existsSync`（无授权的行为变更） | 🟡 | 回退为「不可解析即未初始化」原语义 |
| R6 | 新增的存活组扫描是全新失败面（兄弟分片损坏会让删除中断） | 🟡 | 包 try/catch → `degraded` + 退回旧行为 |
| R7 | `group-create.ts` 的 `TreeNode` 自引用（TS2456）与 `withScopeWriteLock` 返回类型错误 | 🟡 | 改索引签名 + `async` 回调 |
| R8 | 共享场景预览与实际反向偏离（预览 5 / 实际 1） | 🟡 | hint 明说「共享向量会保留，实际删除数可能少于预览」 |

### 7.4 验证（已验证，非静态推断）

`delete-group` 13/13 · `group-create` 9/9 · `group-cli` 5/5 · `group-cache` 20/20 · `group-key-invariant` 5/5 · `delete-relation-wiki` 4/4 · `lib` 37/37 · `fts-only-client` 2/2 · `tsc -p tsconfig.src.json` 0 · root `tsc` 仅 2 条既有错误 · `npm run build` exit 0；真实 daemon 链路：删组后 `doc list` 0 条、`search a-01` 空、同内容 A/B 场景删 A 后 B 的 5 条向量与检索完好。

### 7.5 跟进项

1. `vectorListAuxDocsByGroups` 的真引擎 filter 契约纳入 `test/zvec-engine*.test.mjs`。
2. 早期版本写入、无 `group` 字段的辅助向量清不到 → 兜底 `ki rebuild-vector`（已写入 `docs/group.md`）。
