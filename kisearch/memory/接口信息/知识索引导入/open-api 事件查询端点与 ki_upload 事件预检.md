---
groupPath: 接口信息/知识索引导入
relation: open-api 事件查询端点与 ki_upload 事件预检
exportedAt: "2026-11-19T07:08:47.264Z"
---
`lifecycle=event` 上传前先查事件状态，避免「整包传完才被 400 拒绝」且拿不到可用事件清单。
- 新增 `GET /open/v1/events`（只读）：`event=#3|evt_…` 查单个（回显 title / typeName / stage{name,visibility} / terminalAction / closed）；不传 event 走列表（status=open|closed|all、q、limit 1~50）
- 事件不存在 → 404 `OPEN_API_EVENT_NOT_FOUND` + `available`（至多 5 条未收口）。已收口事件照常 200 返回 closed:true —— 查询端点不替上传做判断，否则调用方分不清「不存在」与「收口了」
- 不受 `uploadApi` 开关影响（与 ping 同侧）；只读 Token 可用（GET）
- 存在理由：httpflex 在 POST 4xx 时丢响应体，脚本只能拿到状态码，服务端返回的 available 与具体 OPEN_API_* 码全丢
- 脚本侧：`ki_upload.py events` 子命令 + `--event` 时自动预检（`precheck_event`，在体积预检之前）；`--no-precheck` 一并跳过；成功输出带 `event` 字段
- 位置：`src/lib/open-api/routes/events.ts`、`src/lib/open-api/index.ts`、`skills/ki-upload/scripts/ki_upload.py`