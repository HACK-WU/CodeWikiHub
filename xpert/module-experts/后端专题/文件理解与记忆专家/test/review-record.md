# 评审与修复记录 · 文件理解与记忆专家（2026-10-16）

## 一、方式
2 个独立评审 agent（不参与产出）：**A 事实与契约正确性**（每包抽 ≥14 条可证伪断言回源码核实 + 专项检查）· **B 完备性与交叉引用**（结构完备性、父子互指、共享文件闭环、R1–R7 实质性、可用性、元文件与口径一致性）。

## 二、结论
- 评审 A：21 条断言，**P1×2**（①「无迁移 DDL / `synchronize:false`」结论过强——实测 `apps/api/src/schema-sync.ts` 启动期会依据实体元数据执行 `dataSource.synchronize()`，仅 `XPERT_SCHEMA_SYNC=external` 才 false ② 表数「11（7+3+1）」不成立——`file-understanding` 实测 **6 张自建表**）+ P2×1（`PUT /dream/config` 的 `gate` 不经 DTO 白名单）
- 评审 B：**P0 无**；口径一致性评为「正样板」（旧写法 `/contexts/file` 已被显式纠正）
- 判定：**可交付**（先修两条 P1）

## 三、已修复
| 编号 | 严重度 | 修复 |
|---|---|---|
| A-P1-1 | P1 | 迁移口径改为条件式：默认由启动期 schema sync 依据实体对齐 DDL；仅外部托管（`XPERT_SCHEMA_SYNC=external`）才 `synchronize:false` 并在仓库外建表；补「实体收窄也可能被自动改表」的反向风险 |
| A-P1-2 | P1 | 表数统一为 **10 张**（自建 6 + 跨域只读 3 + `storage_file` 1），6 篇同步；并在 `C0`/`agent.md` 标注口径 |
| A-P2-1 | P2 | `PUT /dream/config` 注明 `gate{…}` 不经 DTO 白名单、仅由 service 归一化 |

## 四、复验
- 结构自检：**R1–R7 / CR1–CR10 全部通过**
- 口径复验：关键硬数字已统一（见第三节）
- `agent.md`：子专家行已按 **①②③ 编号 + 正文同序**输出（生成器修复，对后续专家生效）
- ki：本专家 15 条已写入（scope `xpert-memory` **415** 条，镜像同步）

## 五、未修（留待下一轮）
- **复跑 jest** 回填 `test/known-failures.md` §3（三包均「⏳ 待复跑」，零 FAIL 事实）
- 跨专家边界引用仍以「」文本点名为主（如需可点击，可批量替换为 `file://` 链接）
- `###` 级小节不单列「章节来源」（本专题口径：来源按 `## §` 计）
