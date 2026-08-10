#!/usr/bin/env bash
# PreToolUse(Bash): warn when eslint is called without --fix. One run with --fix is enough: it
# fixes what it can and still reports what it cannot, so a bare re-run adds nothing.
# Exits 0 (allow) regardless: this is a warning, not a block.
cmd=$(jq -r '.tool_input.command // ""')

if [[ "$cmd" =~ eslint ]] && [[ ! "$cmd" =~ --fix ]]; then
  echo "⚠️  eslint called without --fix. Run \`eslint <files> --fix\` instead: it auto-corrects what it can and still reports the rest. One run is enough."
fi

exit 0
