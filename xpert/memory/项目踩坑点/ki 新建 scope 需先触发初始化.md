---
groupPath: 项目踩坑点
relation: ki 新建 scope 需先触发初始化
exportedAt: "2026-10-16T03:52:14.870Z"
---
# ki 新建 scope 需先触发初始化

## 现象

对从未使用过的 scope（如 `xpert`）直接调用 `ki_manage_index_create`，返回错误：

```
{ "ok": false, "error": "group-index.json 不存在" }
```

尽管工具描述声称"scope 不存在则自动创建"，实际并不会。

## 原因

- 代码：`src/manage-index.ts` 的 create 路径只做 `readGroupIndex(scope)`，文件缺失即返回错误，未调用 `ensureScopeDir`。
- 对比：`src/query-group.ts`（约 801 行）与 store 路径会先调 `ensureScopeDir(scope)`，其内部在目录/关键文件缺失时调用 `initScope(scope)`，从 `_template/` 复制 `group-index.json` 与 `relations-cache.json` 模板完成初始化。

## 解决

1. 先对目标 scope 调用一次 `ki_query_group`（scope 参数为目标 scope），触发 `ensureScopeDir` → `initScope`，完成 scope 目录与索引文件初始化（返回空索引统计即成功）。
2. 再执行 `ki_manage_index_create` 创建 Group，即可成功。

## 相关路径

- 数据目录：`/root/.ki-data/<scope>/group-index.json`、`relations-cache.json`（由 `dataDir` 配置决定）。
- 模板目录：kisearch 包内 `_template/`。
- 源码仓库：`/root/knowledge-indexer`（`src/lib/store.ts` 的 `ensureScopeDir` / `initScope`）。