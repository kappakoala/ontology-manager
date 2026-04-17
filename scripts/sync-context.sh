#!/bin/bash
# sync-context.sh
# 将 WorkBuddy 工作记忆同步到 context/ 目录并推送到 GitHub
# 用法：bash scripts/sync-context.sh "可选的 commit 消息"

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
MEMORY_DIR="/Users/koala/WorkBuddy/20260414132546/.workbuddy/memory"
CONTEXT_DIR="$PROJECT_DIR/context"

echo "🔄 同步 AI 上下文..."

# 同步 MEMORY.md（长期记忆）
if [ -f "$MEMORY_DIR/MEMORY.md" ]; then
  cp "$MEMORY_DIR/MEMORY.md" "$CONTEXT_DIR/MEMORY.md"
  echo "  ✓ MEMORY.md"
fi

# 同步最近 7 天的日志
for f in "$MEMORY_DIR"/2026-*.md; do
  [ -f "$f" ] || continue
  filename=$(basename "$f")
  cp "$f" "$CONTEXT_DIR/$filename"
  echo "  ✓ $filename"
done

# Git 提交
cd "$PROJECT_DIR"
git add context/
if git diff --cached --quiet; then
  echo "  ℹ️  context/ 无变化，跳过提交"
else
  MSG="${1:-chore: sync AI context}"
  git commit -m "$MSG"
  echo "  ✓ 已提交：$MSG"
fi

# 推送
git pull --rebase origin main
git push origin main
echo "✅ 同步完成！"
