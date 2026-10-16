---
groupPath: 专题记忆/AI对话链路
relation: deepseek-flash 思考级别实测口径
exportedAt: "2026-10-16T02:50:10.881Z"
---
# deepseek-flash 思考级别实测（2026-10-16，https://api.deepseek.com）

## 结论（用户环境模型 deepseek-flash）
- **不传参数 = 上游默认档仍思考**：多步推理题 reasoning tokens 中位 **1273**（n=8，`max_tokens=4096`），与显式 `high`（中位 1344）**中位数接近**（差约 5.6%，非统计检验）⇒ 默认档 ≈ high。
- `low` 中位 988 —— 抑制效果**不稳定**（跨轮次时高时低，不能承诺“选 low 更快更省”）。
- `max` 中位 **2778**（约默认档 2.2 倍，**稳定显著**，跨轮一致）。
- **单次波动极大**：同档位 405–4096 tokens（约 10 倍）⇒ 档位是**软约束**，验收 / 文案都不得用单次观测。
- **上游不校验取值**：`reasoning_effort` 传 `medium` / 荒谬值 `ultra` 均返回 **200 正常结果** ⇒ 拼错的值被静默接受、无报错 ⇒ 白名单只能在本地定义（config.yaml 清单 + 服务端强校验）。
- **`thinking:{"type":"disabled"}` 可彻底关闭思考**：3/3 次 `reasoning_tokens=0`、正文正常。
- 流式延迟：首块 **0.3–0.4s**（思考一开始就流式产出）⇒ **不会撞 `firstByteTimeoutMs`(30s)**；正文首字：默认 3.6–6.8s / low 4.4–10.4s / **max 12.9–16.8s**（9 请求并发取样，仅相对趋势，非时延基准）。
- 参数名与位置：`reasoning_effort`（body 顶层）；本项目口径取值 = low / high / max。

## 取证脚本（临时验证文件）
`temp/probe-deepseek-reasoning-effort.py`（字段接受度）/ `…2.py`（重复取样 + 关闭思考）/ `…3.py`（难题 6 次）/ `…4.py`（主证据：每档 8 次）/ `…5.py`（流式首块延迟）。脚本只读 `~/.ki/config.yaml`，**不回显 apiKey**。

## 关联需求
REQ-20261016-001（AI对话思考级别可配置）· 草案。