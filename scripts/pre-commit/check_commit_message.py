"""检查提交信息是否符合 Conventional Commits 规范。

规范格式：
    <type>: <description>
    <type>(<scope>): <description>

类型：feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert
"""

import re
import sys
from pathlib import Path

# Conventional Commits 类型
VALID_TYPES = {
    "feat", "fix", "docs", "style", "refactor", "perf",
    "test", "chore", "ci", "build", "revert",
}

# 提交信息格式
PATTERN = re.compile(
    r"^(?P<type>[a-z]+)"
    r"(?:\((?P<scope>[^)]+)\))?"
    r":\s+"
    r"(?P<description>.+)"
)


def check_commit_message(msg: str) -> tuple[bool, str]:
    """检查单条提交信息。"""
    msg = msg.strip()

    # 忽略 merge commit
    if msg.startswith("Merge "):
        return True, ""

    match = PATTERN.match(msg)
    if not match:
        return False, f'格式不符："{msg[:80]}"\n  期望格式：<type>: <description> (如 feat: 新增功能)'

    msg_type = match.group("type")
    if msg_type not in VALID_TYPES:
        return False, f'无效类型 "{msg_type}"，有效类型：{", ".join(sorted(VALID_TYPES))}'

    description = match.group("description")
    if len(description) < 2:
        return False, f'描述过短："{description}"'

    return True, ""


def main():
    # pre-commit 通过环境变量或参数传入 commit msg 文件路径
    msg_file = sys.argv[1] if len(sys.argv) > 1 else ".git/COMMIT_EDITMSG"
    msg_path = Path(msg_file)

    if not msg_path.exists():
        print(f"⚠️  找不到提交信息文件：{msg_path}")
        return 0

    msg = msg_path.read_text(encoding="utf-8").strip()
    ok, error = check_commit_message(msg)

    if ok:
        print("✅ 提交信息格式正确")
        return 0
    else:
        print(f"❌ {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
