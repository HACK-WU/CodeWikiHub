# 向量引擎专家

**一句话职责**：kisearch 的检索基座——ZvecEngine 门面（worker 多线程隔离架构），提供 dense 语义、FTS 全文、hybrid 混合检索；支持带 dense schema 的 hybrid Collection 与不含 dense/embedding 的 FTS-only Collection。

**负责的模块**：`src/zvec-engine/`（14 文件，独立子项目，`tsconfig.src.json` 独立构建到 `dist/zvec-engine`）

**何时找这个专家**：
- 需要理解 / 修改向量库底层行为（检索算法、embedding、schema、Filter、异常体系）
- 需要诊断向量相关错误（CollectionLocked / DimensionMismatch / SchemaMismatch 等）
- 需要扩展向量引擎能力（新 embedding 提供商、新检索方式、新标量字段）
- 需要了解 worker 多线程架构与进程隔离机制

**契约层就绪**：`C0 + C1 + C4` 就绪

**更新记录**：2026-09-22 增量补充 FTS-only Collection：`vectorDir/collections/<scope>` 与 `vectorDir/fts-collections/<scope>` 分离，每个 scope 独立 Collection；FTS-only 不创建 dense schema、不调用 embedding。此前 2026-08-28 对齐 58c12ca 的 Worker 族异常与 idle-race 说明仍有效。

**包含的资产**：
- 契约层：`C0-使用总览.md`、`C1-能力契约.md`、`C4-数据流向与消费.md`
- 实现层：`implementation/01-架构.md`、`02-实现.md`、`04-模型.md`、`05-接口.md`、`06-测试.md`

**测试状态**：测试目录 `test/`（`zvec-engine*.test.mjs` 7 个），✅ 可跑（`npm run test:zvec-engine`，node --test）；⚠️ embedding 相关用例需真实 API Key。详见 `implementation/06-测试.md` 与 `test/known-failures.md`。

**出处行**：生成日期 2026-08-06（更新 2026-08-28，git commit 8adc487）
