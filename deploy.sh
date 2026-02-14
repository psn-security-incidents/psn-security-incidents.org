#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

# Stage only site files (not private .md docs)
git add \
  .gitignore \
  *.html \
  css/ \
  data/ \
  js/ \
  img/ \
  lang/ \
  deploy.sh

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo "Nothing to deploy — no changes."
  exit 0
fi

git commit -m "Site update $(date +%Y-%m-%d)"
git push origin main

echo "Deployed. GitHub Pages will rebuild in ~1 minute."

# ── API (Cloudflare Worker) ──────────────────────────────────────────
# The API is deployed separately. It is NOT part of the GitHub Pages site.
#
# Redeploy after changes:
#   cd api && npx wrangler deploy
#
# If you changed the D1 schema (api/src/db/schema.sql), run the migration first:
#   cd api && npx wrangler d1 execute psn-incidents --file=src/db/schema.sql
#
# Secrets (e.g. RESEND_API_KEY) persist across deploys and are set with:
#   cd api && npx wrangler secret put RESEND_API_KEY
