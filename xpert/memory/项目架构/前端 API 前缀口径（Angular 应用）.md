---
groupPath: 项目架构
relation: 前端 API 前缀口径（Angular 应用）
exportedAt: "2026-10-16T03:52:14.870Z"
---
# 前端 API 前缀口径（Angular apps/cloud）

## 结论：`${this.apiBaseUrl}` / `${this.apiUrl}` / `${this.API_URL}` **不是**统一的 base url，取值按所属服务而定，禁止按名字臆断。

## 精确映射（逐条回源码核实，2026-10-14）

| 写法 | 实际值 | 核实位置 |
|------|--------|----------|
| `API_PREFIX` | `/api` | `apps/cloud/src/app/@core/state/constants/app.constants.ts:1` |
| `${this.API_URL}`（UsersService） | `/api/user` | `@core/state/users.service.ts:123` |
| `${this.API_URL}`（CustomSmtpService） | `/api/smtp` | `@core/services/custom-smtp.service.ts:12` |
| `${this.API_URL}`（TenantService） | `/api/tenant` | `@core/services/tenant.service.ts:13` |
| `${this.API_FEATURE}`（FeatureService） | `/api/feature` | `@core/services/feature/feature.service.ts:17` |
| `${this.apiUrl}`（ReferralService） | `/api/referral` | `@core/state/referral.service.ts:10` |
| `${this.apiBaseUrl}`（PluginAPIService） | `/api/plugin` | `@core/state/plugin.service.ts:40`（`API_BASE = API_PREFIX + '/plugin'` 传入 super） |
| `${this.apiBaseUrl}`（SkillPackageService） | `/api/skill-package` | `@core/services/skill-package.service.ts:14` |
| `${this.apiBaseUrl}`（SkillRepositoryService） | `/api/skill-repository` | `@core/services/skill-repository.service.ts:21` |
| `${this.apiBaseUrl}`（XpertAPIService） | `/api/xpert` | `@core/services/xpert.service.ts:136`（`API_XPERT_ROLE`，定义 `@core/constants/app.constants.ts:8`） |
| `${apiUrl}`（ChatKit runtime 参数） | `/api/ai` 前缀（同源） | `features/assistant/assistant-chatkit.runtime.ts:267,525`（`buildAssistantApiUrl` = `resolveAbsoluteApiBaseUrl(base)` + `/api/ai`） |
| `${this.apiBaseUrl}`（ai-workspace-files / file-memory） | `apiBaseUrl` = `${injectApiBaseUrl()}${API_PREFIX}/ai/assistants`、`${API_PREFIX}/xpert` | `@core/services/ai-workspace-files.service.ts:11`、`file-memory-api.service.ts:100` |

## 基类机制（理解为什么）

- `BaseCrudService` / `CrudService`（`@core/state/base-crud.service.ts:11`）通过构造函数参数 `constructor(protected apiBaseUrl: string)` 接收前缀；子类 `super(...)` 传入各自的 `API_PREFIX + '/<domain>'`。
- 所以 grep `${this.apiBaseUrl}` 得到的是**使用点**，定义要追到子类构造函数 `super()` 实参。

## 常见错误

- ❌ 把 `${this.apiBaseUrl}` 统一当成 `injectApiBaseUrl()`（同源 base）——实测错误：`referral.service.ts:10` 的 `${this.apiUrl}` 实为 `/api/referral`。
- ✅ 正确做法：按调用符号（via）找到服务类，再追 `super(...)` 或类内常量定义行核实。

## 索引资产

- `.fe-index/xpert-cloud/`（前端页面↔接口索引，slug xpert-cloud）的 `apis/*.md` 备注列已对每条未解析行给出「等价路径」；口径表见其 `index.md`。