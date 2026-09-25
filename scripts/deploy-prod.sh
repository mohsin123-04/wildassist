#!/usr/bin/env bash
# Promote to PRODUCTION (wildassist.vercel.app).
#
# Only run this after the same commit has been verified on staging. Because
# staging and production share one database, any SQL migration this release
# needs should already have been run (additively) before you got here.
#
# Usage:  ./scripts/deploy-prod.sh
set -euo pipefail

export npm_config_cache="${npm_config_cache:-/tmp/npm-cache-wildassist}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "${BRANCH}" != "main" ]; then
  echo "You're on '${BRANCH}', not 'main'. Merge to main before deploying prod:"
  echo "    git checkout main && git merge --ff-only ${BRANCH} && git push"
  exit 1
fi

echo "==> Deploying to production..."
npx --yes vercel@latest --prod --yes
echo "==> Production updated: https://wildassist.vercel.app"
