"""检查提交内容中的敏感信息（API Key、Token 等）。

检测模式：
- SiliconFlow / OpenAI API Key (sk-...)
- Bearer Token
- 常见 Key 模式 (api_key=, apiKey=, api-key=)
"""

import re
import sys
from pathlib import Path

# 敏感信息检测模式
PATTERNS = [
    # API Key 模式：sk- 开头 + 至少 32 位随机字符
    (r'sk-[a-zA-Z0-9]{32,}', "API Key (sk-...)"),
    # Bearer Token
    (r'Bearer\s+[a-zA-Z0-9\-_\.]{20,}', "Bearer Token"),
    # 明文 API Key 赋值（JSON/YAML/代码）
    (r'(api[_-]?key|apiKey|apikey|api_secret)\s*[:=]\s*["\']?[a-zA-Z0-9\-_]{20,}', "明文 API Key 赋值"),
    # JWT Token
    (r'eyJ[a-zA-Z0-9\-_]{20,}\.[a-zA-Z0-9\-_]{10,}\.[a-zA-Z0-9\-_]{10,}', "JWT Token"),
    # 常见的密码/密钥字段
    (r'(password|passwd|secret|token)\s*[:=]\s*["\'][^"\']{8,}["\']', "明文密码/Secret/Token"),
]

def check_file(filepath: str) -> list[str]:
    """检查单个文件，返回违规信息列表。"""
    violations = []

    try:
        content = Path(filepath).read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return violations

    for pattern, desc in PATTERNS:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for m in matches:
            # 跳过占位符模式
            matched = m.group(0)
            if "{{" in matched or "your-" in matched.lower() or "your_" in matched.lower():
                continue
            if "example" in matched.lower() or "placeholder" in matched.lower():
                continue
            # 跳过已知示例路径
            line_no = content[:m.start()].count("\n") + 1
            violations.append(f"  {filepath}:{line_no}  {desc}: {matched[:60]}...")

    return violations


def main():
    files = sys.argv[1:] if len(sys.argv) > 1 else []
    if not files:
        return 0

    all_violations = []
    for f in files:
        all_violations.extend(check_file(f))

    if all_violations:
        print("❌ 检测到敏感信息，禁止提交：")
        for v in all_violations:
            print(v)
        return 1

    print("✅ 敏感信息检查通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
