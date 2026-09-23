#!/usr/bin/env bash
# Create a worktree for an agent to work in, ready to run without a fresh install.
#
#   scripts/new-worktree.sh <branch-name>
#
# - Worktrees live beside the repo in ../amgi-ai-2-worktrees/<name>, so Metro,
#   tsc and eslint in the main checkout never see them.
# - node_modules is cloned copy-on-write (APFS `cp -c`): it takes no disk space
#   until a package in it changes. Workspace symlinks (@amgi/*) are relative, so
#   they resolve to the worktree's own apps/ and packages/.
# - The gitignored .env files are copied from the main checkout.
#
# Remove a worktree once its branch is merged:
#   git worktree remove ../amgi-ai-2-worktrees/<name>
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: scripts/new-worktree.sh <branch-name>" >&2
  exit 1
fi

branch="$1"
main="$(git rev-parse --show-toplevel)"
name="${branch//\//-}"
dest="$(dirname "$main")/$(basename "$main")-worktrees/$name"

if [ -e "$dest" ]; then
  echo "already exists: $dest" >&2
  exit 1
fi

git -C "$main" fetch --quiet origin main
if git -C "$main" show-ref --verify --quiet "refs/heads/$branch"; then
  git -C "$main" worktree add "$dest" "$branch"
else
  git -C "$main" worktree add -b "$branch" "$dest" origin/main
fi

for nm in node_modules apps/mobile/node_modules apps/web/node_modules; do
  if [ -d "$main/$nm" ]; then
    cp -Rc "$main/$nm" "$dest/$nm"
  fi
done

for env in apps/web/.env.local apps/web/.env.production apps/mobile/.env.local; do
  if [ -f "$main/$env" ]; then
    cp "$main/$env" "$dest/$env"
  fi
done

# First free ports above the ones the main checkout uses (8081 Metro, 3000 Next).
free_port() {
  local port=$1
  while lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}
metro_port=$(free_port 8082)
web_port=$(free_port 3001)

cat <<EOF

Worktree ready: $dest  (branch $branch)

  Start an agent:  cd $dest && claude
  Mobile:          cd $dest/apps/mobile && npx expo start --port $metro_port
  Web:             cd $dest && npm run dev --workspace @amgi/web -- -p $web_port

If the branch changes dependencies, run \`npm install\` in the worktree.
EOF
