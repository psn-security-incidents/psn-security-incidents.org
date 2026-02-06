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
