---
id: REQ-20260924-001
feature: Web侧边栏AI对话模块
status: 设计中
created: 2026-09-24
updated: 2026-09-24
version: 1
tags: [feat, ux]
depends_on: []
author: AI
document_type: design
---

# 图片 API

> 所属需求：REQ-20260924-001｜基础路径：`/api/chat`｜错误码见 [INDEX.md §3](INDEX.md#3-错误码定义)｜设计依据：`design/S06`
> 前置：仅当 `config.llm.supportsImages === true` 时可用；为 `false`（默认）时上传接口返回 400，面板隐藏入口

## 模块级约定

| 项 | 值 |
|---|---|
| 认证 / 权限 | 同 [conversations.md](conversations.md) 模块级约定（Bearer + scope 授权） |
| 本地图片路径 | `{chatDir}/{scope}/assets/{convId}__{imageId}{ext}`（文件名前缀绑定会话，便于级联删除） |
| 图片来源 | `local`（本接口上传）｜`kb`（**复用既有 `GET /api/asset`**，本模块不提供 KB 图片接口） |
| mime 白名单 | `image/png`、`image/jpeg`、`image/webp`、`image/gif`（**SVG 排除**，见 T8） |
| 上限 | 单图 `maxImageBytes`（默认 4MB）、单消息 `maxImagesPerMessage`（默认 4 张） |
| 校验 | mime 白名单 + **文件头魔数校验**（防后缀伪装）+ 大小上限 |

## API-09：上传会话图片

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 / 路径 | POST `/api/chat/conversations/:id/images` |
| 幂等 | 否（每次上传生成新 `imageId`） |
| 越权白名单 | 不适用（非 GET） |

### Request Body

```ts
interface UploadImageRequest {
  name: string;      // 原始文件名（含扩展名），1~255 字
  content: string;   // base64 编码的图片内容（不含 data: 前缀）
}
```

### 响应（201）

```ts
interface UploadImageOk {
  ok: true;
  image: { kind: 'local'; id: string; name: string; mime: string; bytes: number; addedAt: string };
}
```

### 错误响应

| HTTP | code | 说明 | 触发条件 |
|:---:|---|---|---|
| 400 | `IMAGE_INVALID` | 图片非法 | mime 不在白名单 / 魔数与后缀不符 / 超过 `maxImageBytes` / `name` 为空 / base64 解码失败 |
| 400 | `IMAGE_INVALID` | 能力未开启 | `llm.supportsImages !== true`（`details[0].message = 当前模型未声明支持图片`） |
| 403 | `SCOPE_FORBIDDEN` | 越权 | 会话所属 scope 不在授权集合 |
| 404 | `CONVERSATION_NOT_FOUND` | 会话不存在 | id 查不到 |
| 500 | `CHAT_WRITE_FAILED` | 落盘失败 | 磁盘满 / 权限 |

### Demo 请求 / 响应

```bash
B64=$(base64 -w0 ./assets/overview.png)
curl -s -X POST http://127.0.0.1:7423/api/chat/conversations/c-mf3k1a-9x2p/images \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"overview.png\",\"content\":\"$B64\"}"
```

```json
{
  "ok": true,
  "image": { "kind": "local", "id": "img-mf4a2b-7k3q", "name": "overview.png", "mime": "image/png", "bytes": 93248, "addedAt": "2026-09-24T17:20:00.000Z" }
}
```

### 关键代码设计

```ts
const IMAGE_MAGIC: Record<string, Buffer> = {
  'image/png':  Buffer.from([0x89, 0x50, 0x4e, 0x47]),
  'image/jpeg': Buffer.from([0xff, 0xd8, 0xff]),
  'image/webp': Buffer.from('RIFF'),      // 需再校验 8-12 字节为 WEBP
  'image/gif':  Buffer.from('GIF8'),
};

export function validateImage(name: string, buf: Buffer, cfg: LlmConfig): { mime: string } {
  if (cfg.supportsImages !== true) {
    throw new ApiError(400, 'IMAGE_INVALID', '当前模型未声明支持图片（llm.supportsImages）');
  }
  const max = cfg.maxImageBytes ?? 4 * 1024 * 1024;
  if (buf.length === 0) throw new ApiError(400, 'IMAGE_INVALID', '图片内容为空');
  if (buf.length > max) {
    throw new ApiError(400, 'IMAGE_INVALID', `图片超过上限 ${(max / 1024 / 1024).toFixed(1)}MB`,
      [{ field: 'content', message: `INVALID_LENGTH：当前 ${(buf.length / 1024 / 1024).toFixed(2)}MB` }]);
  }
  const ext = path.extname(name).toLowerCase();
  const mime = EXT_TO_MIME[ext];
  if (!mime) throw new ApiError(400, 'IMAGE_INVALID', `不支持的图片类型：${ext || '(无后缀)'}`);
  const magic = IMAGE_MAGIC[mime];
  if (!buf.subarray(0, magic.length).equals(magic)) {
    throw new ApiError(400, 'IMAGE_INVALID', '文件内容与扩展名不符（魔数校验失败）');   // 防伪装
  }
  if (mime === 'image/webp' && buf.subarray(8, 12).toString() !== 'WEBP') {
    throw new ApiError(400, 'IMAGE_INVALID', '不是合法的 WebP 文件');
  }
  return { mime };
}
```

> **为什么校验魔数**：仅看后缀会把 `.png` 伪装的可执行内容写进磁盘，后续以 `Content-Type: image/png` 回吐给浏览器形成风险面；且上游也可能因此报错。

## API-10：读取会话图片

### 基本信息

| 项目 | 值 |
|---|---|
| 方法 / 路径 | GET `/api/chat/images/:id?scope=` |
| 幂等 | 是 |
| 响应类型 | 图片二进制（非 JSON 外壳；失败时回退为 JSON 错误体） |
| 越权白名单 | **不登记**（scope 校验在 handler 内完成；该接口不属于"带 scope 的只读 KB 接口"） |

### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 |
|---|---|:---:|:---:|---|
| `id` | path | string | 是 | 形如 `img-{base36}-{rand4}`，正则校验前置 |
| `scope` | query | string | 是 | 目标 scope；启用鉴权时须在授权集合内 |

### 响应

| HTTP | 内容 | 说明 |
|:---:|---|---|
| 200 | 图片二进制 | `Content-Type` 按 mime；`Cache-Control: no-cache`（与既有 `/api/asset` 一致，避免重导后拿到旧图） |
| 400 | `{ ok:false, code:'SCOPE_INVALID' }` | scope 非法 |
| 403 | `{ ok:false, code:'SCOPE_FORBIDDEN' }` | 越权 |
| 404 | `{ ok:false, code:'IMAGE_NOT_FOUND' }` | id 非法或文件不存在（**两者同码，不泄露内部命名规则**） |

### Demo

```bash
curl -s -o /tmp/got.png -w "%{http_code} %{content_type} %{size_download}\n" \
  "http://127.0.0.1:7423/api/chat/images/img-mf4a2b-7k3q?scope=kisearch"
# 200 image/png 93248
```

### 关键代码设计

```ts
export function resolveLocalImagePath(id: string, scope: string, convIdHint?: string): string {
  // 正则前置：字符集不含 . / \，从根上杜绝路径穿越（比事后校验更可靠）
  if (!/^img-[a-z0-9]+-[a-z0-9]{4}$/.test(id)) {
    throw new ApiError(404, 'IMAGE_NOT_FOUND', '图片不存在');
  }
  const dir = path.join(getChatDir(), scope, 'assets');
  // 文件名前缀为 {convId}__，若已知会话则直接定位；否则扫描该 scope 的 assets 目录
  const hit = convIdHint
    ? path.join(dir, `${convIdHint}__${id}`)
    : fs.readdirSync(dir).find((f) => f.includes(`__${id}`)) && path.join(dir, fs.readdirSync(dir).find((f) => f.includes(`__${id}`))!);
  if (!hit || !fs.existsSync(hit)) throw new ApiError(404, 'IMAGE_NOT_FOUND', '图片不存在');
  return hit;
}
```

## KB 图片引用（无需新接口）

会话消息中的 `kb` 类型引用形如：

```json
{ "kind": "kb", "scope": "kisearch", "group": "wiki/部署运维", "path": "topology.png", "name": "topology.png", "addedAt": "2026-09-24T17:24:00.000Z" }
```

- **前端展示**：直接请求既有 `GET /api/asset?scope=&group=&path=`（已含双锚点校验、mime 白名单、SVG 沙箱、`no-cache`）
- **发送给模型**：由 daemon 读取该文件并内联为 data URI；路径校验**必须复用 `/api/asset` 的同款双锚点逻辑**（不可自行拼接），失效时返回 409 `KB_IMAGE_MISSING` 并指明具体图片
- **生命周期**：删除会话**不删除** KB 图片；KB 图片被删/重导后，历史消息中的引用会失效，界面显示「图片已失效」占位（见 S-06 §3.5）

## 错误码增补（同步至 [INDEX.md §3](INDEX.md#3-错误码定义)）

| code | HTTP | 说明 | 触发条件 |
|---|:---:|---|---|
| `IMAGE_INVALID` | 400 | 图片非法或能力未开启 | 见 API-09 错误表 |
| `IMAGE_NOT_FOUND` | 404 | 本地图片不存在 | id 非法或文件缺失 |
| `KB_IMAGE_MISSING` | 409 | 引用的知识库图片已失效 | 发送前校验失败（**N13 fail-loud**） |
