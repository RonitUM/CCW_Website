#!/usr/bin/env bash
# Deploy dist/ to gh-pages WITHOUT breaking visitors who hold a cached index.html.
#
# Background: index.html is served with cache-control max-age=600 and references
# hashed bundles (assets/index-<hash>.js/css). A plain `rsync --delete` removes
# the previous bundles, so any client whose cached HTML still references them
# gets a page that cannot boot at all (observed 2026-11-12: cards not visible
# on a phone until the bundles were restored, gh-pages c3a923d).
#
# This script unions the CURRENT live hashed bundles into the new dist before
# publishing, so cached pages keep booting the previous version until their
# HTML cache expires (<=10 min), then they pick up the new version naturally.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="${1:-$REPO_ROOT/dist}"
WT="${2:-/tmp/ghp}"

[ -d "$DIST/assets" ] || { echo "dist not built: $DIST" >&2; exit 1; }

# origin/gh-pages may not exist on a fresh clone (default fetch refspec covers
# only some branches); fetch it explicitly before resolving.
git -C "$REPO_ROOT" fetch -q origin gh-pages:refs/remotes/origin/gh-pages
PREV_SHA="$(git -C "$REPO_ROOT" rev-parse origin/gh-pages)"

# Fresh worktree at the live gh-pages tip (holds the currently-served bundles).
git -C "$REPO_ROOT" worktree remove --force "$WT" 2>/dev/null || true
git -C "$REPO_ROOT" worktree add "$WT" "$PREV_SHA" --detach -q

# Retain every hashed bundle the new build replaced (no-clobber union).
rsync -a --ignore-existing "$WT/assets/" "$DIST/assets/"

# Publish the union.
rsync -a --delete --exclude='/.git' "$DIST/" "$WT/"
git -C "$WT" add -A
if git -C "$WT" diff --cached --quiet; then
  echo "no changes to publish"
else
  git -C "$WT" -c user.name='shaihi' -c user.email='shaihi@users.noreply.github.com' \
    commit -q -m "${3:-Deploy site}"
  git -C "$WT" push origin HEAD:gh-pages
fi
echo "published; previous bundles retained under assets/"
