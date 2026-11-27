---
groupPath: 项目踩坑点
relation: 写锁 op 登记表新增通道必须同批表态
exportedAt: "2026-11-25T09:07:07.302Z"
---
给 `withScopeWriteLock` 引入新 op 时，必须同批在 `src/lib/scope-policy.ts` 的 `EXEMPT_OPS` / `BLOCKED_OPS` 登记并写理由，否则 `test/scope-readonly.test.ts` 的「覆盖全部 op 字面量」用例变红（设计 D14 / 验收 18）。
- 判据: 写库内容 → BLOCKED；批量更新与运维（import、datasource-*、scope-clear、trash-purge 等）→ EXEMPT
- 位置: `src/lib/scope-policy.ts`、`test/scope-readonly.test.ts`
- 2026-11-25 补登记: `analysis-ask`（事件追问 sidecar 追加、删除、清空，锁 key 是 `askLockKey(scope,eventId)`，但写的仍是该库数据）、`event-pin`（改事件 `pinnedAt`，刻意不走带 revision 的 updateEvent）→ 均 BLOCKED
- 防回归要点: 只断言「会抛 SCOPE_READONLY」没有判别力——`unknown` 走的是同一条默认拦截分支，回归时静默变绿；应断言 `describeOperationPolicy(op) === 'block'`
- 发布门禁缺口: `scripts/release.sh` 不跑后端全量测试，登记表漏项红了也能发出去