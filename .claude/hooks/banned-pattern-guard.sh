#!/usr/bin/env bash
# PostToolUse(Edit|Write): block banned patterns in source files at write-time.
# scripts/checkBannedPatterns.ts is used for detection, the same checker the lint-staged uses
# pre-commit task runs, so write-time and commit-time enforce an identical list and skip-list.
# The extension list matches lint-staged.config.js and the checker's own: .cts was missing, and
# .vue/.svelte held the logic of two of the seven targets with nothing looking at it.
f=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
case "$f" in
  *.ts|*.tsx|*.mts|*.cts|*.vue|*.svelte) ;;
  *) exit 0 ;;
esac
[ -f "$f" ] || exit 0
hits=$(node "$CLAUDE_PROJECT_DIR/scripts/checkBannedPatterns.ts" "$f" 2>&1)
if [ "$?" -ne 0 ]; then
  jq -n --arg h "$hits" '{decision:"block",reason:("Banned pattern. No escape-hatch casts (as never / as unknown as / => unknown), no @ts-ignore or @ts-expect-error, no eslint-disable, no Record<string, unknown>, no index signatures. Build the real type instead.\n"+$h)}'
fi
exit 0
