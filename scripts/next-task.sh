#!/usr/bin/env bash
# Reset a lane for its next task: a fresh branch from origin/main.
#
#   scripts/next-task.sh <branch-name>
#   scripts/next-task.sh              # park: detached at origin/main, no branch yet
#
# Run inside a lane made by scripts/new-lane.sh. It refuses to run on a dirty
# tree or when the current branch has commits that aren't on origin. The previous
# branch is deleted once merged into main, otherwise kept, and its copy on origin
# goes with it (only if everything on it is in main). The .env files are
# re-copied from the main checkout, and npm install runs if the lockfile changed.
set -euo pipefail

if [ $# -gt 1 ]; then
  echo "usage: scripts/next-task.sh [branch-name]" >&2
  exit 1
fi

branch="${1:-}"
root="$(git rev-parse --show-toplevel)"
gitdir="$(git rev-parse --path-format=absolute --git-dir)"
common="$(git rev-parse --path-format=absolute --git-common-dir)"
main="$(dirname "$common")"

if [ ! -f "$gitdir/lane" ]; then
  echo "not a lane: $root (make one with scripts/new-lane.sh)" >&2
  exit 1
fi
# shellcheck source=/dev/null
. "$gitdir/lane"

if [ -n "$(git status --porcelain)" ]; then
  echo "working tree isn't clean; commit, stash or discard first:" >&2
  git status --short >&2
  exit 1
fi

git fetch --quiet --prune origin

prev="$(git symbolic-ref --quiet --short HEAD || true)"
delete_prev=false
if [ -n "$prev" ] && [ "$prev" != "$branch" ]; then
  if git merge-base --is-ancestor "$prev" origin/main; then
    delete_prev=true
  elif [ "$(git rev-parse "$prev")" = "$(git rev-parse --verify --quiet "origin/$prev" || true)" ]; then
    echo "note: $prev isn't merged yet; keeping the branch (it's pushed)."
  else
    echo "$prev has commits that aren't on origin; push it first." >&2
    exit 1
  fi
elif [ -z "$prev" ] && ! git merge-base --is-ancestor HEAD origin/main; then
  echo "detached HEAD has commits that aren't on origin/main; put them on a branch first." >&2
  exit 1
fi

if [ -z "$branch" ]; then
  git switch --quiet --detach origin/main
elif git show-ref --verify --quiet "refs/heads/$branch"; then
  git switch --quiet "$branch"
else
  git switch --quiet -c "$branch" origin/main
fi

if $delete_prev; then
  git branch --quiet -D "$prev"
  echo "deleted merged branch $prev"
  # The fetch above pruned it if GitHub already deleted it. Checking the remote
  # tip, not the local one, keeps anything pushed after the merge.
  remote_tip="$(git rev-parse --verify --quiet "refs/remotes/origin/$prev" || true)"
  if [ -n "$remote_tip" ] && git merge-base --is-ancestor "$remote_tip" origin/main; then
    if git push --quiet origin --delete "$prev"; then
      echo "deleted merged remote branch origin/$prev"
    else
      echo "note: couldn't delete origin/$prev; delete it on GitHub." >&2
    fi
  elif [ -n "$remote_tip" ]; then
    echo "note: origin/$prev has commits that aren't in main; keeping it."
  fi
fi

for env in apps/web/.env.local apps/web/.env.production apps/mobile/.env.local; do
  if [ -f "$main/$env" ]; then
    cp "$main/$env" "$root/$env"
  fi
done

lockhash="$(shasum "$root/package-lock.json" | cut -d' ' -f1)"
if [ "$lockhash" != "$(cat "$gitdir/lane-lockhash" 2>/dev/null || true)" ]; then
  echo "package-lock.json changed; running npm install..."
  (cd "$root" && npm install --silent)
  echo "$lockhash" > "$gitdir/lane-lockhash"
fi

cat <<EOF

On ${branch:-origin/main (parked; start a task with scripts/next-task.sh <branch>)} in $root

  Mobile:  cd $root/apps/mobile && npx expo start --port $metro_port
  Web:     cd $root && npm run dev --workspace @amgi/web -- -p $web_port
EOF
