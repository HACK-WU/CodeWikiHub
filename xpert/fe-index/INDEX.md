# 索引登记表（.fe-index/）

> 涉及下列应用的问题，先查对应条目所在的分区/映射表，再看代码。
> 「根目录」列：绝对路径直用。前后端各占一行（slug 不同，不合并）。

| 应用 | 类型 | slug | 根目录 | 规模 | commit | 生成日期 |
|------|------|------|--------|------|--------|----------|
| xpert（后端 server / server-ai） | backend | xpert | `/root/xpert` | 模块 145 · 表 226 | 80f5676fd7 | 2026-10-16 |
| xpert-cloud（Angular 前端） | frontend | xpert-cloud | `/root/xpert` | 页面 81 · 接口 205 | 80f5676fd | 2026-10-16 |

## 新鲜度校验

```bash
python3 /root/.codebuddy/skills/backend-index/scripts/scan_backend.py --root /root/xpert --check --index /root/xpert/.fe-index/xpert
python3 /root/.codebuddy/skills/frontend-index/scripts/scan_frontend.py --root /root/xpert --check --index /root/xpert/.fe-index/xpert-cloud
```
