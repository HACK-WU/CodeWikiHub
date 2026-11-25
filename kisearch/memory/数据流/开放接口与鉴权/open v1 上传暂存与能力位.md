---
groupPath: 数据流/开放接口与鉴权
relation: open v1 上传暂存与能力位
exportedAt: "2026-11-25T08:07:10.407Z"
---
对外通道的数据实体流向（基线 0f1426b）。
- ~/.ki/import-uploads/<uploadId>/：生产方 createUploadSession，含 .scope / .upload-session.json / content/ / .upload.tar.gz，消费方为导入 job，用途是解耦上传与导入两阶段。
- capabilities：生产方 handleOpenApiPing，去向为 ping 响应体，消费方为 ki-client 与第三方程序，用途是决定哪些命令可用。
- Token：不在本域落盘，由 mcp-token.ts 经 resolveTokenAuth 注入。
- 详细流向：见 .module-experts/开放接口与鉴权专家/C4-数据流向与消费.md。