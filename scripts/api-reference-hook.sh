#!/bin/bash
# Hook: regenerates docs/references_api.md when entity/controller/module/enum files change.
# Receives Claude Code PostToolUse JSON on stdin.

FILE=$(jq -r '.tool_input.file_path // empty' 2>/dev/null)

if [ -z "$FILE" ]; then
  exit 0
fi

echo "$FILE" | grep -qE '\.(entity|controller|module|enum)\.ts$' || exit 0

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
node "$SCRIPT_DIR/generate-api-reference.js"
