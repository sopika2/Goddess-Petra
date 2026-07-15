#!/usr/bin/env bash
#
# Roll the site back to the last-known-good LIVE version (the state it was in
# before the DM/upload/blocking overhaul). Run this ON THE PRODUCTION BOX if the
# new version misbehaves.
#
#   bash scripts/rollback.sh
#
# It checks out the tagged restore point, rebuilds, and stops — then you restart
# the app however you normally do (pm2 / systemd / etc.). Your DATABASE is left
# untouched on purpose: every schema change the new version made was additive
# (new tables/columns only), so the old code simply ignores them. Nothing to
# undo there, and none of your data is lost.
#
# To go BACK to the newest version later:
#   git checkout main && git pull && npm ci && npm run build   (then restart)

set -euo pipefail

# The tag is the friendly name; the commit hash is the guaranteed fallback (it's
# always in the server's history even if the tag was never pushed).
RESTORE_POINT="${1:-live-backup-2026-07-15}"
FALLBACK_COMMIT="e0080e8"

echo "==> Fetching…"
git fetch --tags --all || true

if ! git rev-parse -q --verify "${RESTORE_POINT}^{commit}" >/dev/null; then
  echo "    (tag '${RESTORE_POINT}' not found — falling back to commit ${FALLBACK_COMMIT})"
  RESTORE_POINT="${FALLBACK_COMMIT}"
fi

echo "==> Checking out restore point: ${RESTORE_POINT}"
git checkout "${RESTORE_POINT}"

echo "==> Installing dependencies…"
npm ci

echo "==> Building…"
npm run build

cat <<'DONE'

==> Rollback build complete.

Now RESTART the app so it serves the old build, e.g.:
    pm2 restart goddess-petra        # if you use pm2
    # or: sudo systemctl restart <your-service>
    # or: however you normally start `npm start` / node server.mjs

You are now on the pre-overhaul version. Your database is unchanged.

When the new version is fixed and you want it back:
    git checkout main && git pull && npm ci && npm run build   (then restart)
DONE
