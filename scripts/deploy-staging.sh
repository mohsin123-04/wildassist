#!/usr/bin/env bash
# Deploy the current branch to the STAGING environment.
#
# Staging is a normal Vercel preview deployment pinned to a stable URL, so you
# always test at the same address. It talks to the SAME Supabase database as
# production, so run any additive SQL migrations first and keep them
# backwards-compatible (add columns, never drop) - old prod code must keep
# working against the new schema.
#
# Usage:  ./scripts/deploy-staging.sh
set -euo pipefail

STAGING_URL="wildassist-staging.vercel.app"
export npm_config_cache="${npm_config_cache:-/tmp/npm-cache-wildassist}"

echo "==> Building and deploying a preview..."
# Capture the unique deployment URL that this build produced.
DEPLOY_URL="$(npx --yes vercel@latest --yes 2>/dev/null | tail -1)"
echo "    deployment: ${DEPLOY_URL}"

echo "==> Aliasing to https://${STAGING_URL}"
npx --yes vercel@latest alias set "${DEPLOY_URL}" "${STAGING_URL}"

echo "==> Staging is live: https://${STAGING_URL}"
