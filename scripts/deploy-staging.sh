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

LOG="$(mktemp -t wa-staging-deploy)"
echo "==> Building and deploying a preview..."
npx --yes vercel@latest deploy --yes >"${LOG}" 2>&1

# The build prints its unique deployment URL; grab the last vercel.app line.
DEPLOY_URL="$(grep -oE 'https://[a-z0-9-]+\.vercel\.app' "${LOG}" | tail -1)"
if [ -z "${DEPLOY_URL}" ]; then
  echo "Could not find a deployment URL. Full log:"
  cat "${LOG}"
  exit 1
fi
echo "    deployment: ${DEPLOY_URL}"

echo "==> Aliasing to https://${STAGING_URL}"
npx --yes vercel@latest alias set "${DEPLOY_URL}" "${STAGING_URL}"

echo "==> Staging is live: https://${STAGING_URL}"
