#!/usr/bin/env bash
# PreToolUse(Bash): deny banned git ops. `git stash` collides with a concurrent session's
# lint-staged backup stash and corrupts foreign files; --no-verify, --amend, `git add -A|.` and
# `git reset` are standing bans: a reset rewrites the index or the working tree wholesale, and a
# hard reset to HEAD throws away work nobody can recover. Stage by explicit path; for a baseline
# or attribution check use a throwaway git worktree at HEAD, never git stash.
cmd=$(jq -r '.tool_input.command // ""')
if printf '%s' "$cmd" | grep -qE 'git[[:space:]]+stash|--no-verify|--amend|git[[:space:]]+reset\b|git[[:space:]]+add[[:space:]]+(-A\b|--all\b|\.([[:space:]]|$))'; then
  jq -n '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:"Banned git op (git stash / git reset / --no-verify / --amend / git add -A|--all|.). Stage only your own files by explicit path, unstage with git restore --staged; for baseline or attribution checks use a throwaway `git worktree` at HEAD, never `git stash` or a reset."}}'
fi
exit 0
