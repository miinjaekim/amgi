#!/usr/bin/env bash
# Create a long-lived lane: a worktree an agent reuses task after task.
#
#   scripts/new-lane.sh <number>
#
# - The lane lives in ../amgi-ai-2-worktrees/lane-<number> and starts detached
#   at origin/main. Start each task inside it with scripts/next-task.sh.
# - Ports are fixed per lane: Metro 8081+n, Next 3000+n.
# - node_modules is cloned copy-on-write as in new-worktree.sh; the .env files
#   and .claude/settings.local.json (approved permissions) are copied over.
set -euo pipefail

if [ $# -ne 1 ] || ! [[ "$1" =~ ^[1-9][0-9]*$ ]]; then
  echo "usage: scripts/new-lane.sh <number>" >&2
  exit 1
fi

n="$1"
common="$(git rev-parse --path-format=absolute --git-common-dir)"
main="$(dirname "$common")"
dest="$(dirname "$main")/$(basename "$main")-worktrees/lane-$n"

if [ -e "$dest" ]; then
  echo "already exists: $dest" >&2
  exit 1
fi

git -C "$main" fetch --quiet origin main
git -C "$main" worktree add --detach "$dest" origin/main

for nm in node_modules apps/mobile/node_modules apps/web/node_modules; do
  if [ -d "$main/$nm" ]; then
    cp -Rc "$main/$nm" "$dest/$nm"
  fi
done

for f in apps/web/.env.local apps/web/.env.production apps/mobile/.env.local .claude/settings.local.json; do
  if [ -f "$main/$f" ]; then
    mkdir -p "$(dirname "$dest/$f")"
    cp "$main/$f" "$dest/$f"
  fi
done

# Lane state lives in the worktree's own git dir, out of the working tree.
gitdir="$(git -C "$dest" rev-parse --path-format=absolute --git-dir)"
metro_port=$((8081 + n))
web_port=$((3000 + n))
printf 'metro_port=%s\nweb_port=%s\n' "$metro_port" "$web_port" > "$gitdir/lane"
# node_modules came from the main checkout, so it matches the main lockfile.
shasum "$main/package-lock.json" | cut -d' ' -f1 > "$gitdir/lane-lockhash"

cat <<EOF

Lane ready: $dest  (detached at origin/main)

  Start a task:  cd $dest && scripts/next-task.sh <branch> && claude
  Mobile:        cd $dest/apps/mobile && npx expo start --port $metro_port
  Web:           cd $dest && npm run dev --workspace @amgi/web -- -p $web_port
EOF
