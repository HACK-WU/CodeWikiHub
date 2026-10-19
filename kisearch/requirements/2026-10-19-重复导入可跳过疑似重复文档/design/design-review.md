# 设计评审报告：重复导入可跳过疑似重复文档

- 文档：`design/DESIGN.md` + `S01_跳过判定与run契约_DESIGN.md` + `S02_统计口径与跳过明细_DESIGN.md` + `S03_前端三选一与结果呈现_DESIGN.md`
- 格式：design-craft 多文档
- 评审时间：2026-10-19
- 交叉验证：代码直读（`import.ts` / `mcp-http-api.ts` / `ImportPage.tsx` / `import-conflict.ts`），非仅文档自评
- 评审结论（第 2 轮）：**⚠️ 有条件通过** —— 3 个阻断项已修复，1 项待产品确认（按钮主次）

---

## 第 1 轮

### 🔴 阻断

| # | 维度 | 位置 | 问题 | 修改建议 | 依据 |
|---|---|---|---|---|---|
| R1 | 一致性 | S-02 §3.3 | `scanned` 定为"剔除前 `files.length`"，但 `onlyRelPaths` 叠加时 `files` 含白名单外文件 ⇒ 恒等式 `completed+incomplete+skipped=scanned` 破裂；且现有 `skipped` 是反算式（`effectiveFiles - fileRecords - unchanged`，`import.ts:1865`） | 分母基准改为「白名单后、剔除前」`baseAfterOnly.length`；`skipped` 基数同步换成该值（**不得再 +dupSkipCount**，否则重复计数） | 代码直读 + 恒等式推导 |
| R2 | 体验/正确性 | S-03 §3.3 | `launchImport` 首行 `setPreflightConfirm(null)`；而 `ALL_FILES_DUPLICATES` 是**异步 job** 才知道 ⇒ 面板数据已丢，"保持 awaiting-confirm / 可继续「仍然导入」"不可达，用户只能重新上传（AC15 失效） | 跳过分支先写入 `preflightSnapshotRef`，命中错码时用它恢复面板 | 代码直读（`launchImport` 现状） |
| R3 | 完整性 | S-02 §3.4 | 只在 `Job` 加 `errorCode`，但 `GET /api/import/status` 是**手工挑字段**（`mcp-http-api.ts:1982-1996`），不补则前端永远拿不到错码，R2 的修复也无从触发 | 明确要求 status 响应透传 `errorCode` | 代码直读 |

### 🟡 警告

| # | 维度 | 位置 | 问题 | 修改建议 |
|---|---|---|---|---|
| R4 | 正确性 | S-01 §3.2 | 原方案"把 `onlyRelPaths` 解析段整体前移"会在**不传 skipDuplicates** 时也改变错误优先级（预算超限 vs 非法清单谁先报），违反 AC8 | 改为仅在 `skipDuplicates=true` 时额外提前解析一次，既有解析段原位不动 |
| R5 | 质量 | S-02 §3.3 | 未指明"改哪一处"统计公式；现有 `skipped` 是反算而非数组相加，照抄设计里的 `skipped.length + ...` 会与实现不符 | 明确改 `import.ts:1865` 的反算式，并给出恒等式证明表 |
| R6 | 完整性 | S-02 §4 | `stats.files.total`（= `fileRecords.length`）在跳过场景的口径未定义 | 明确 total 不含跳过项（既有语义），并在字段表登记 |
| R7 | 体验 | S-03 §5 D1 | 「跳过重复文档」设为 primary 属**主次对调**（原 primary 是「仍然导入」），改动用户习惯但未给依据、未确认 | 补否决方案 ③（保持原主次）并转为待产品确认项 |
| R8 | 边界 | S-03 §3.2 | 禁用判据 `matched >= scanned` 在旧 daemon（无 `files.scanned`）时恒为 false，用户会点到一个必然失败的按钮 | 抽 `canSkip`（`typeof scanned === 'number' && scanned > 0 && matched < scanned`），缺失时不提供跳过能力 |
| R9 | 正确性 | S-01 §3.2 | 未定义三条校验的顺序（非法清单 / 清单全缺失 / 全部重复），错误码可能互相遮蔽 | 补"校验顺序"表（1→2→3） |
| R10 | 完整性 | S-02 §3.3 | `ImportResult` 有多个 return 分支（含两处早退），只说"一致"未列全 | 点名早退分支 `import.ts:1094-1134` 必须同改 |

### 🟢 建议

| # | 维度 | 位置 | 问题 | 修改建议 |
|---|---|---|---|---|
| G1 | 一致性 | S-02 vs S-03 | 预检明细含 `existingSourcePath`，结果明细不含，两处展示字段不一致 | 结果区展示可省略来源（避免噪声），在两处文档各写一句差异说明 |
| G2 | 完整性 | S-03 §7 | 未列深色主题 / 窄屏走查 | 加入走查脚本项（`temp/verify-*.cjs` 覆盖暗色与 900/1100 两档） |

---

## 修复动作（第 1 轮 → 第 2 轮）

| 问题 | 修复位置 | 结果 |
|---|---|---|
| R1 | S-02 §3.3：`scannedBase` + 恒等式证明表 + 明确"不得重复加" | ✅ |
| R2 | S-03 §3.3：`preflightSnapshotRef` + 恢复动作；§3.4 表格同步 | ✅ |
| R3 | S-02 §3.3 末尾 + S-03 §3.4 引用 | ✅ |
| R4 | S-01 §3.2：条件化提前解析 + 既有段不动 | ✅ |
| R5 | S-02 §3.3：指出 `import.ts:1865` 反算式 + 证明表 | ✅ |
| R6 | S-02 §3.3 字段表 `total` 注释 | ✅ |
| R7 | S-03 §5 D1：补否决方案 ③ + §8-4 待产品确认 | ⏸ 待确认（不阻塞） |
| R8 | S-03 §3.2：`canSkip` + 降级不提供跳过 | ✅ |
| R9 | S-01 §3.2：校验顺序表 | ✅ |
| R10 | S-02 §3.3：点名早退分支 | ✅ |
| G1/G2 | 保留为实施期注意事项 | 记录 |

---

## 第 2 轮（增量复评）

| 前次问题 | 严重度 | 状态 |
|---|---|---|
| R1 `scanned` 基准 | 🔴 | ✅ 已修复（`scannedBase` + 证明表） |
| R2 面板快照 | 🔴 | ✅ 已修复（`preflightSnapshotRef`） |
| R3 status 透传 | 🔴 | ✅ 已修复（明确写入 S-02） |
| R4 ~ R6、R8 ~ R10 | 🟡 | ✅ 已修复 |
| R7 按钮主次 | 🟡 | ⏸ 转为待产品确认（§8-4） |
| G1 / G2 | 🟢 | 记录，不阻塞 |

**新增问题**：0

**结论**：⚠️ 有条件通过 —— 阻断项清零；唯一遗留是"跳过按钮是否作为 primary"的产品取舍，不影响技术可行性与验收标准。

**下一步**：进入 `challenger` 二次质疑；质疑通过后可 `plan-track` 建档实施。

---

## 第 3 轮（challenger 意见修复后的增量复评）

### 前次质疑项验证

| challenger 意见 | 严重度 | 修复位置 | 状态 |
|---|---|---|---|
| 意见 1：终态清理清掉 `uploadPlanRef` 与凭据 ⇒ 被拦截后无法改选 | 🔴 | S-03 §3.4.1（`keepForReselect` 白名单 + 生命周期闭环 + 验收断言）；§7 影响范围同步 | ✅ 已修复 |
| 意见 2：AC3 与 D4 适用场景不匹配 | 🟡 | 需求 `AC3-a`/`AC3-b` + Q4 落地口径；S-01 D4 标注适用范围 | ✅ 已修复 |
| 意见 3：性能数字假精确 | 🟡 | DESIGN 风险 7 改 `[需实测]`；S-01 新增「性能与降级」（探针 + 静态进度文案 + >5s 预案） | ✅ 已修复 |
| 意见 4：任务中心仍记 `failed` | 🟡 | S-01 新增「任务台账口径」（保留 failed 状态、引导性文案 + 未写入标注） | ✅ 已修复 |

### 修复引入的新增问题（本轮发现 1 条，已修）

| # | 维度 | 位置 | 问题 | 处理 |
|---|---|---|---|---|
| N1 | 正确性 | S-03 §3.4.1 | `keepForReselect` 把 `phase` 改回 `awaiting-confirm`，但若轮询仍在跑或错码分支排在 `job.state === 'failed'` 之后，`phase` 会被覆盖回 `failed`，面板刚恢复又消失 | 已补「轮询与刷新约束」：错码分支必须前置于 failed 分支、恢复后不再轮询该 job、刷新场景不进入 `keepForReselect` |

### 继承项

- R7（按钮主次）维持「待产品确认」，不影响技术可行性；其余见第 2 轮。
- G1/G2 维持记录，不阻塞。

**结论**：⚠️ **有条件通过** —— 技术阻断清零，challenger 的 1 🔴 + 3 🟡 全部修复并复评；唯一遗留是 §5-4 的产品取舍（按钮主次），可在实施期由产品一句话决定。

**下一步**：`plan-track` 建档实施；实施顺序 **S-01 → S-02 → S-03**，但前端 `ImportPage.tsx` 的 `keepForReselect` 与 `preflightSnapshotRef` 必须与 S-03 一起落地（它是 AC15 的唯一阻塞点）。
