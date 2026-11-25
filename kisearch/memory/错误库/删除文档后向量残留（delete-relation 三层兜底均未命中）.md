---
groupPath: 错误库
relation: 删除文档后向量残留（delete-relation 三层兜底均未命中）
exportedAt: "2026-11-16T10:56:55.239Z"
---
删文档后仍能被 ki search 召回：内容向量靠 cache.memoryIds → relation 名检索+标题前缀匹配两条兜底，路径向量靠重算 docId + 名称前缀检索，任一形态判据不覆盖就留孤儿。

**实测（2026-11-16，证据 `.debug/delete-vector-residual-20261116/`）**：① sync + 正文标题≠relation 名 + memoryIds 漂移 → 残留 1 条 ki-search；② 标题=relation 名 → 同样 `memMethod:search` 但删净（说明现场 `relationVectorDeleted:0` 属正常：hidden 阶段路径向量已被摘）；③ import 形态 → 残留 2 条（`导入文档X-01` + 组级 ki-path）且 reason 不写原因。

**真因**：`deleteBySearch` 要求 relation 名作标题前缀（正文标题不同即必漏）；`deleteRelationVector` 载体只算纯名 + 历史形态，**漏 import 的 `relation-NN` 后缀**；文档级删除从不处理组级 ki-path；两个删除函数 `deleted > 0` 即当完全成功。
★ 更正旧判断：「visibility-queue dense 分支不回写 memoryIds」为误（`defaultWriteDense` → `vectorWriteBack` 末尾会回写）。

**已修复（2026-11-16，未提交）**：三层删除（memoryIds → 正文重算 docId → 检索正文比对）、路径向量补 `relation-NN` 候选并保证给 reason、组内清空后清 ki-path、全部改为核对实删数（缺口写进 reason）。真机三场景删后检索均 0 条。设计与取舍见 `决策记录/删除与摘除的向量清理改用可重算加实删校验`。

- 位置: `src/delete-relation.ts`、`src/lib/content-vector-match.ts`
- 验证: `test/delete-relation-content-vector.test.ts` 7/7、`test/delete-relation-relation-vector.test.ts` 8/8、真机三场景
- 状态: 已修复（代码未提交）