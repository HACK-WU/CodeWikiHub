# S-01 映射约定与配置 · 设计

## 1. 术语

| 术语 | 定义 |
|---|---|
| 主库 | 承载业务知识的 scope，如 `kisearch`、`monitor` |
| 图集库 | 承载某主库图集的 scope，如 `kisearch-atlas` |
| 显式映射 | `config.yaml` 的 `atlas.mappings` 中登记的主库 → 图集库对应 |
| 后缀约定 | 未登记映射时的兜底：`<主库>-atlas` |
| 图集库自指 | 若传入名已以 `-atlas` 结尾，视为图集库本身，不再二次加后缀 |

## 2. 现状（AS-IS）

- 图集安装只认「落点库」：`src/atlas.ts:50 requireWritableScope()` 直接取 `--scope`，没有任何「主库 → 图集库」概念。
- md 导入同样只认落点：`skills/atlas-deploy/SKILL.md §3.2` 要求 `ki import --scope` 与 `ki atlas upload --scope` 同值。
- 前端只按当前 scope 查状态：`web/src/lib/hooks.ts` 的 `useAtlasTargets` 对单库 `[scope]`、视图 `view.members`，无映射。
- `ki_scope_list` 返回 `{ count, scopes, views }`，不携带任何映射信息（`src/lib/mcp-tools/scope-list.ts:32`）。

## 3. 方案（TO-BE）

映射规则集中定义在 `src/lib/atlas/scope-map.ts`，三处消费方全部调用它，不各自推导。

```ts
// src/lib/atlas/scope-map.ts（新增）
export interface AtlasScopeMap {
  /** 主库 → 图集库（显式登记，优先于后缀） */
  mappings: Record<string, string>;
  /** 兜底后缀，默认 '-atlas' */
  suffix: string;
}

/** 主库 → 图集库；已带后缀则自指 */
export function atlasScopeFor(mainScope: string, map: AtlasScopeMap): string;

/** 图集库 → 主库；不是图集库返回 null */
export function mainScopeFor(atlasScope: string, map: AtlasScopeMap): string | null;

/** 判断某 scope 是否图集库（用于前端展示名与上传按钮文案） */
export function isAtlasScope(scope: string, map: AtlasScopeMap): boolean;
```

解析优先级（三档，不可调换）：

```
传入名已命中 mappings 的 value（本身就是某个图集库） → 自指，返回自身
传入名命中 mappings 的 key（显式主库）            → 返回 mappings[name]
传入名以 suffix 结尾                             → 自指
其余                                           → `${name}${suffix}`
```

配置落点：`config.yaml` 新增可选段（`src/lib/config-schema.ts` 白名单加字段，缺省空对象）：

```yaml
atlas:
  suffix: "-atlas"          # 可选，默认 -atlas
  mappings:                 # 可选，显式覆盖
    kisearch: kisearch-atlas
    monitor: monitor-atlas
```

透出给前端：`executeScopeList()`（`src/scope.ts`）的返回值新增 `atlas` 字段，`ki_scope_list` 工具原样带出。前端不读 config、不自己拼后缀。

**显示名与归属解析都以本映射为唯一来源**；图集包内 `meta.mainScope` 只用于排障，不参与展示名计算（避免两处来源漂移）。

## 4. 数据模型

`ScopeListResult` 增量字段（向后兼容，旧前端忽略即可）：

| 字段 | 类型 | 含义 |
|---|---|---|
| `atlas.suffix` | `string` | 兜底后缀 |
| `atlas.mappings` | `Record<string,string>` | 显式映射（已过滤掉不可见库） |

`config.yaml` 的 `atlas` 段：

| 字段 | 类型 | 必填 | 缺省 | 说明 |
|---|---|---|---|---|
| `atlas.suffix` | `string` | 否 | `-atlas` | 非空、长度 2–32、不含 `/` 与空白；不强制以 `-` 开头（`_atlas` 合法） |
| `atlas.mappings` | `Record<string,string>` | 否 | `{}` | key 为主库名，value 为图集库名，均需通过 `validateScope` |

## 5. 接口设计

```ts
// 函数签名（src/lib/atlas/scope-map.ts）
export function resolveAtlasMap(config: KiConfig): AtlasScopeMap;
export function atlasScopeFor(mainScope: string, map: AtlasScopeMap): string;
export function mainScopeFor(atlasScope: string, map: AtlasScopeMap): string | null;
```

Demo 返回（`ki_scope_list` 增量部分，仅示意）：

```json
{
  "atlas": {
    "suffix": "-atlas",
    "mappings": {
      "kisearch": "kisearch-atlas",
      "monitor": "monitor-atlas"
    }
  }
}
```

RBAC 约束：`authScopes !== null` 时，`mappings` 需过滤——主库与图集库任一不可见则整条不返回，避免通过映射枚举未授权库名。

## 6. 关键决策点

| 决策 | 选项 | 结论与理由 | 重新评估触发条件 |
|---|---|---|---|
| 映射来源 | ① 纯后缀推导 ② 配置文件单一来源 | **②**。已有 `consul`/`k8s` 等非后缀命名的库，纯后缀无法关联；且三处消费方各推导必然漂移 | 所有库都能强制按后缀命名时 |
| 配置位置 | ① `config.yaml` ② 独立 `atlas-map.json` ③ 图集 meta 反查 | **①**。`config.yaml` 已有严格 schema 与热加载；meta 反查要求先装包，鸡生蛋 | `config.yaml` 体积或变更频率成为问题时 |
| 后缀是否可配 | ① 硬编码 `-atlas` ② 可配 | **②**。成本一行配置，避免将来强制改名 | 组织统一约定固定后缀时 |
| 被否决：纯前端推导 | 前端拼 `-atlas`，后端只认落点库 | 否决。与「单一来源」冲突，且 AI 侧（`ki_scope_list` / recall）仍需映射 | — |
| 被否决：映射存进 `views.json` | 视图定义里记主库-图集库对 | 否决。映射与视图是两件事；同一主库可能属于多个视图 | — |

## 7. 异常处理

| 场景 | 行为 | 是否对外暴露 |
|---|---|---|
| `atlas.suffix` 为空 / 超长 / 含 `/` | `loadConfig` fail-loud（`CONFIG_FIELD_INVALID`），流程不启动 | 是，配置错误信息 |
| `mappings` 的 key/value 非法 scope 名 | 同上，指出具体键 | 是 |
| `mappings` 出现环（A→B、B→A） | 从每个 key 沿 value 走，遇重复节点即判环；fail-loud 并打印环路径（如 `a → b → a`） | 是 |
| 主库名本身以 `-atlas` 结尾且不在 mappings | 自指，不二次加后缀 | 否（静默正确行为） |
| 图集库不存在 | 本层不判存在性，交由 S-02 建库 | 否 |

## 8. 影响范围

| 文件 | 改动 |
|---|---|
| `src/lib/atlas/scope-map.ts` | 新增：映射解析纯函数 |
| `src/lib/atlas/index.ts` | 导出新模块 |
| `src/lib/config-schema.ts` | 新增 `atlas` 可选段校验 |
| `src/lib/config.ts` | 类型 `KiConfig.atlas?` |
| `src/scope.ts` | `executeScopeList` 返回值加 `atlas` |
| `src/lib/mcp-tools/scope-list.ts` | RBAC 过滤 `atlas.mappings` |
| `web/src/lib/hooks.ts` | `useScopeList` 类型加 `atlas`（消费方在 S-03） |
| `test/atlas-scope-map.test.ts` | 新增单测：后缀、自指、显式映射、环、非法名 |

## 9. 待定问题

| # | 问题 | 处理 |
|---|---|---|
| 1 | 是否需要在 `ki scope list` CLI 输出里也展示映射 | 默认不展示，只在 `--json` 带出；需要时另开 |
| 2 | 全局共享视图（`just-test` 13 成员）是否也自动关联 | 默认会（其 members 含主库）；需要排除时用 S-02 的 `--views` 限定 |

默认假设：单机部署、scope 总数 ≤ 200、映射表 ≤ 50 条；解析为纯内存计算，不引入额外 IO。

## 10. 本子需求不在范围内

- 图集库的创建与装机（S-02）
- 前端回落、切换器与文案（S-03）
- `views.json` 成员写入与 Token 补授权（S-02）
