# S-03 前端：预检面板三选一与结果呈现

> 父文档：`DESIGN.md`（契约以 §3 为准）
> 对应需求：R1 / R3 / R4 / R6、§3.2 全表、N1 / N4 / N5、AC1 / AC2 / AC7 / AC9 / AC13 / AC15 / AC16

---

## 1. 术语

| 术语 | 定义 |
|---|---|
| 等待确认态 | `phase='awaiting-confirm'`：上传完成、预检命中、导入未开始 |
| 可纠正提示 | 因"全部重复"被拦截时的呈现：黄/警告色 + 引导，不进入 `phase='failed'`、不显示红色「导入失败」 |
| 跳过明细 | 结果区的 `result.duplicatesSkipped` 列表（≤500 条） |

---

## 2. 现状（AS-IS）

| 事实 | 位置 |
|---|---|
| 面板只有两个动作：`仍然导入`（primary）/ `取消`（secondary） | `web/src/pages/ImportPage.tsx:1868-1875` |
| 明细只渲染前 5 条，无展开 | `ImportPage.tsx:1856-1862` |
| `preflightConfirm` 只存 `{ matched, duplicates, truncated }`，**没有 `scanned`** | `ImportPage.tsx:393`、`:1138-1142` |
| 预检响应已含 `files.scanned`（后端已有，前端未消费） | `src/lib/import-preflight.ts:42-47` |
| `launchImport(plan)` 调 `runImport({scope, uploadId, ...plan.finalize})` | `ImportPage.tsx:1148-1162` |
| `phase` 枚举含 `awaiting-confirm` / `cancelled`；`busyPhase` 用于禁用主按钮 | `ImportPage.tsx:326-335`、`:1127-1146` |
| 取消分支必须迁 `phase`，否则页面锁死（2026-10-19 已修） | `ImportPage.tsx:1171-1189` |
| 结果区读 `result.stats` 与 `partialFiles` | `ImportPage.tsx:2043-2050` |
| `runImport`（前端）无 `skipDuplicates` 参数 | `web/src/api/httpApi.ts:410-430` |

---

## 3. 方案（TO-BE）

### 3.1 类型与请求

`web/src/api/httpApi.ts`：

```ts
export async function runImport(args: {
  scope: string;
  uploadId: string;
  // ...既有参数
  /** 跳过「内容一致但来源不同」的重复文档（REQ-20261019-002）；缺省 false */
  skipDuplicates?: boolean;
}): Promise<{ ok: boolean; jobId?: string; scope?: string; error?: string; code?: string }>;

export interface ImportDuplicateSkipItem { path: string; existingGroup: string; existingRelation: string }

export interface ImportResult {
  // ...既有
  stats: { files: { duplicatesSkipped?: number } /* 其余同既有 */ };
  duplicatesSkipped?: ImportDuplicateSkipItem[];
  duplicatesSkippedTruncated?: boolean;
}
```

> 新字段全部**可选**，兼容旧 daemon（缺省按 0 / [] 渲染）。
> ⚠️ `ImportJob.result` 当前类型是 `Record<string, unknown>`（`web/src/api/httpApi.ts:169`），读取处用 `as Partial<ImportResult>` 断言即可；**本期不收紧该类型**，避免波及其他既有读取点。

### 3.2 预检面板（三选一）

```tsx
{preflightConfirm && (
  <div className="ki-card" style={{ borderColor: 'var(--ki-color-warning)' }}>
    {/* ① 标题（既有） */}
    {/* ② 明细：前 5 条 + <details> 展开全部；truncated 时写「另有 N 篇未列出」 */}
    {/* ③ 计数行（新增，Q5 口径） */}
    <div className="ki-cell-sub">
      本批共 {scanned} 篇：其中 {matched} 篇疑似重复、其余 {scanned - matched} 篇将按当前设置处理。
    </div>
    {/* ④ 三个动作 */}
    {/* canSkip：scanned 缺失（旧 daemon）时不提供跳过能力，降级为既有两按钮 */}
    <button className="ki-btn ki-btn--primary ki-btn--small"
            onClick={skipDuplicateImport}
            disabled={!canSkip}
            title={canSkip ? undefined : '全部文件均为疑似重复，跳过将不导入任何文件'}>
      跳过重复文档
    </button>
    <button className="ki-btn ki-btn--secondary ki-btn--small" onClick={confirmDuplicateImport}>
      仍然导入（会新建副本）
    </button>
    <button className="ki-btn ki-btn--secondary ki-btn--small" onClick={cancelDuplicateImport}>
      取消
    </button>
    {!canSkip && typeof scanned === 'number' && (
      <div className="ki-form-hint">全部 {scanned} 篇均为疑似重复，跳过将不导入任何文件；如需建副本请点「仍然导入」。</div>
    )}
  </div>
)}
```

- `preflightConfirm` 类型改为 `{ matched: number; scanned: number; duplicates: ...; truncated: boolean }`（`afterUploadsComplete` 从 `preflight.files.scanned` 取值）；
- 明细展开：用原生 `<details><summary>展开全部 {matched} 篇</summary>`，不引入新组件；
- 计数行在 `scanned === 0`（异常）时不渲染（防"共 0 篇"）。

### 3.3 发起跳过

```ts
/** 面板快照：job 以 ALL_FILES_DUPLICATES 终止时用它恢复面板（此时 preflightConfirm 已被清空） */
const preflightSnapshotRef = useRef<PreflightConfirmState | null>(null);

const launchImport = async (
  plan: UploadPlan,
  options?: { skipDuplicates?: boolean },
): Promise<void> => {
  if (options?.skipDuplicates) preflightSnapshotRef.current = preflightConfirm; // ★ 先快照
  setPreflightConfirm(null);
  setProgressText(options?.skipDuplicates ? '正在跳过疑似重复并导入其余文件…' : '正在启动导入…');
  try {
    const response = await runImport({
      scope: plan.scope, uploadId: plan.uploadId, ...plan.finalize,
      ...(options?.skipDuplicates ? { skipDuplicates: true } : {}),
    });
    if (!response.ok || !response.jobId) throw Object.assign(
      new Error(response.error ?? '导入启动失败'), { code: response.code });
    trackImport(response.jobId, plan.scope, plan.uploadId);
  } catch (failure) { /* 见 3.4 */ }
};

const skipDuplicateImport = (): void => {
  const plan = uploadPlanRef.current;
  if (!plan) return;
  void launchImport(plan, { skipDuplicates: true });
};
```

> ⚠️ **不能让面板数据随 `setPreflightConfirm(null)` 一起消失**：`ALL_FILES_DUPLICATES` 是异步 job 失败（轮询阶段才知道），此时面板早已清空。没有 `preflightSnapshotRef`，用户只能重新上传整批 —— AC15 就不可达（这是本次评审抓到的阻断项）。

**状态机约束**（照 2026-10-19 事故）：三个按钮都必须把 `phase` 迁出 `awaiting-confirm`——跳过、仍然导入走 `launchImport`（随后进入 `importing`），取消走 `cancelDuplicateImport`（`cancelled`）。

### 3.4 错误与可纠正提示

| 情况 | 识别 | 呈现 | `phase` |
|---|---|---|---|
| run 返回 409 `IMPORT_JOB_PARAMS_MISMATCH` | `failure.code` | 面板内警告条：「该批次已在导入中（与本次设置不同），请到任务中心查看或等待完成」+「改为仍然导入」按钮 | 保持 `awaiting-confirm`（不清面板） |
| job 终态 `errorCode === 'ALL_FILES_DUPLICATES'` | `job.errorCode`（需后端在 `/api/import/status` 显式透传，见 S-02 §3.3） | **可纠正提示**（警告色，不显示红色「导入失败」）：说明全部为疑似重复 + 「仍然导入」可点 | `awaiting-confirm`：**用 `preflightSnapshotRef.current` 恢复 `preflightConfirm`**，并清空快照；**不落 `failed`** |
| 其他 job 失败 | 既有 | 既有红态 | `failed` |

> 识别点在既有的 job 状态映射处（`trackImport`/轮询回调）：先判 `errorCode`，再走既有分支。`errorCode` 缺省（旧 daemon）时行为不变。

#### 3.4.1 终态清理与 plan 生命周期（★ challenger 意见 1，必须与 3.4 成对实现）

> **实施期订正（2026-10-19，代码核对后）**：初稿把清理点写成"终态清理 effect"，实际不是——
> `uploadPlanRef` 只在**离开导入页再回来**的清理 effect（`ImportPage.tsx:590-593`）里置空；
> job 失败走的是**轮询 failed 分支**（`:841-861`），它清的是 localStorage **凭据**
> （`clearImportCredentialIf`），并不清 plan。因此真正的问题是"面板已清空 + 落 `failed` 红态"，
> 用户没有任何入口继续。修复落在轮询分支，不新增 `keepForReselect`。

**修复（实际实现）**

```ts
// 轮询回调里：
} else if (res.job.state === 'failed') {
  active = false;
  clearInterval(timer);
  invalidateImportQueries(targetScope);
  if (res.job.errorCode === 'ALL_FILES_DUPLICATES' && preflightSnapshotRef.current) {
    setJob(null);
    setPreflightConfirm(preflightSnapshotRef.current);   // 恢复面板
    setPhase('awaiting-confirm');                        // 不落 failed
    setScopeConfirmed(false);
    setFailureStage(null);
    setError(null);
    setProgressText('本批全部为疑似重复，未导入任何文件；如需建副本请点「仍然导入」');
    return;                                              // ★ 不执行 clearImportCredentialIf
  }
  clearImportCredentialIf({ jobId: job.id });            // 其余失败：既有逻辑
  setPhase('failed');
  ...
}
```

`launchImport` 的 catch 同样按错码分流：`IMPORT_JOB_PARAMS_MISMATCH` → 用快照恢复面板并保持 `awaiting-confirm`，不落 `failed`。

**生命周期闭环**

```
点「跳过重复文档」→ 快照面板 + 起 job
  ├─ job 成功           → 正常清理（plan/凭据清空），面板消失；补导副本需重新上传（需求 AC3-b）
  └─ job failed(ALL_FILES_DUPLICATES)
        → keepForReselect 分支：保留 plan/凭据 + 恢复面板 + phase=awaiting-confirm
        → 点「仍然导入」→ run(skipDuplicates 缺省) → 参数不同 + job 终态 → S-01 D4 新建 job
              └─ 新 job 成功 → 走正常清理（此时才真正释放 plan/凭据）
```

**轮询与刷新约束**

- job 进入终态后既有轮询即停止；恢复面板**不得**重新轮询该 job，否则 `phase` 会被覆盖回 `failed`（错码分支必须排在 `job.state === 'failed'` 的既有分支之前）。
- 刷新页面时 `preflightSnapshotRef` 为空 ⇒ 不进入 `keepForReselect`，走既有清理（与现状一致：`awaiting-confirm` 本就不可跨刷新）。

**验收断言（AC15）**：拦截后面板可见、`uploadPlanRef.current !== null`、localStorage 凭据仍在、点「仍然导入」能成功起 job 且 `skipDuplicates` 未传。

### 3.5 结果区

在既有结果摘要后追加一段（仅当 `duplicatesSkippedCount > 0`）：

```tsx
{skippedDuplicates > 0 && (
  <p className="ki-cell-sub" style={{ marginTop: 4 }}>
    已跳过 {skippedDuplicates} 篇疑似重复（未写入知识库）。
    {result?.duplicatesSkippedTruncated ? ` 仅展示前 ${duplicates.length} 条，共 ${skippedDuplicates} 条。` : ''}
  </p>
)}
{duplicates.length > 0 && (
  <details>
    <summary>查看跳过的 {duplicates.length} 篇</summary>
    <ul>{duplicates.map((d) => <li key={d.path}>{d.path} ↔ 已有「{d.existingRelation}」（{d.existingGroup}）</li>)}</ul>
  </details>
)}
```

- `skippedDuplicates = result?.stats?.files?.duplicatesSkipped ?? 0`；
- 与既有"文件级：扫描 N（完成 / 未完成 / 跳过）"并存：`扫描` 用 `partialFiles.scanned`（剔除前），**不改既有渲染**；
- 任务重新开始（`start`）时清空上一轮结果（既有流程已重置 `job`/`result`，无需额外处理）。

---

## 4. 接口设计（前端）

| 项 | 内容 |
|---|---|
| 调用 | `runImport({ scope, uploadId, group?, ..., skipDuplicates?: true })` |
| 成功 | `202 → { ok: true, jobId, scope }` → `trackImport` 轮询 |
| 失败（同步） | `{ ok: false, code?, error }` → 按 `code` 分流（3.4） |
| 失败（异步） | `job.errorCode` + `job.error` → 按错码渲染可纠正提示 |
| 兼容 | 旧 daemon 无 `skipDuplicates` 字段时：请求被忽略 → 仍全量导入；前端需在 `preflight` 响应缺 `files.scanned` 时回退显示「检测到 N 篇…」（既有文案） |

Demo（面板计数行）：

```text
本批共 96 篇：其中 23 篇疑似重复、其余 73 篇将按当前设置处理。
```

Demo（结果区）：

```text
已跳过 23 篇疑似重复（未写入知识库）。
▸ 查看跳过的 23 篇
```

---

## 5. 关键决策点

| # | 决策 | 被否决方案 | 否决理由 | 重新评估触发条件 |
|---|---|---|---|---|
| D1 | 三个平铺按钮，**「跳过重复文档」为 primary**（相对改前主次对调：原 primary 是「仍然导入」） | ① 把"跳过"塞进「同名文档处理」下拉；② 二次确认弹窗；③ 保持「仍然导入」为 primary、跳过为 secondary | ① 语义不同维度，混在一起会让 `skip` 的既有语义说不清；② 面板本身就是确认层，再弹一层增加交互成本；③ 会把"不产生副本"的保守动作藏成次要——但**主次对调改变既有用户习惯，需产品确认**（见 §8-4） | 若产品确认沿用原主次，改为 secondary 并保持文案不变 |
| D2 | 全部重复时**前端禁用** + 后端兜底 fail-loud | 只靠后端拦截 | 用户点了才知道不行，多一轮等待；且后端只能经 job 失败回传 | 无 |
| D3 | 错码 → **可纠正提示**，不落 `failed` | 复用既有失败红态 | 用户点的是正常按钮，看到"导入失败"会误判系统故障（与 2026-10-19「取消不是失败」同型） | 若错码体系扩展，可抽 `errorCode → tone` 映射表 |
| D4 | 计数用 `scanned`（预检扫描数） | 只显示 `matched` | 用户无法判断"跳过之后还剩多少"，也不知是否会变成空导入 | 无 |
| D5 | 明细用 `<details>` 就地展开 | 模态框 / 跳转新页面 | 打断当前操作；且明细是只读核对，无需独立页面 | 若明细超过 500 条需检索，再考虑独立页 |
| D6 | `launchImport` 增加可选第二参，不新建函数 | 为跳过单写一条 `startSkipImport` | 两条路径会重复实现错误处理与 `trackImport`，历史上已因分支重复出过锁死事故 | 无 |

---

## 6. 异常处理

| 场景 | 行为 | 用户可见 |
|---|---|---|
| `scanned` 缺失（旧 daemon） | 回退到既有标题文案，不渲染计数行 | 否（降级） |
| `matched >= scanned` | 「跳过重复文档」禁用 + 原因 | 是 |
| run 409（参数不一致） | 面板警告 + 保留面板 | 是 |
| job `ALL_FILES_DUPLICATES` | 可纠正提示 + 「仍然导入」 | 是（非红态） |
| 预检失败（网络/500） | 既有逻辑直接导入；在 `uploadErrors` 提示「预检失败，已直接开始导入」 | 是（既有） |
| 结果字段缺失（旧 daemon） | 不渲染跳过段落 | 否 |
| 等待确认期刷新 | 现状丢失（需重新上传）；文案不承诺记忆 | 否 |

---

## 7. 影响范围

| 文件 | 变更 |
|---|---|
| `web/src/pages/ImportPage.tsx` | `preflightConfirm` 增加 `scanned`；面板三按钮 + 计数行 + 明细展开；`launchImport` 可选参数；`skipDuplicateImport`；错码分流；结果区跳过段落；**终态清理加 `keepForReselect` 白名单（§3.4.1）** |
| `web/src/api/httpApi.ts` | `runImport` 参数与返回 `code`；`ImportResult` / `ImportJob` 补字段 |
| `web/src/styles/ki.css` | 预期**零改动**（复用 `ki-card` / `ki-btn` / `ki-cell-sub` / `ki-form-hint`）；若需警告条则复用既有 `ki-import-errors` 变体 |
| `web/test/import-preflight-cancel.test.mjs` | 回归（三按钮后取消路径不变） |
| `temp/verify-import-skip-duplicates.cjs`（新增） | 页面走查：三按钮、禁用态、结果区、错码提示、深色主题 |

---

## 8. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| 1 | 结果明细是否提供"跳转到已有文档"的深链（推演 G1） | 本期不做；后续可复用 `browseUrl.deepLink` |
| 2 | 面板是否加一句"疑似重复 = 原文逐字节一致"的口径说明（G3） | 建议加在计数行下方，由实施者按视觉密度决定 |
| 3 | 警告条样式是否新增 token | 优先复用 `--ki-color-warning`，不新增 |
| 4 | **按钮主次对调**（「跳过重复文档」变 primary）是否可接受 | 需产品确认；若维持原主次，改 `ki-btn--secondary` 即可，不影响其余设计 |
| 5 | 面板恢复时是否要提示"上次点的是跳过" | 建议恢复面板时在标题下加一行说明，避免用户以为“什么都没发生” |
