#!/usr/bin/env bash
set -euo pipefail

# Configuration
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)/study-planner"
APP_DIR="$ROOT_DIR/apps/onboarding2"
TF_DIR="$(cd "$(dirname "$0")/.." && pwd)/terraform"
BUCKET_NAME="${STUDY_PLANNER_BUCKET_NAME:-study-planner.upscpro.laex.in}"
DIST_ID="${STUDY_PLANNER_CLOUDFRONT_DISTRIBUTION_ID:-}"
AWS_REGION="${AWS_REGION:-ap-south-1}"

# Ensure dependencies
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing $1. Please install it." >&2; exit 1; }; }
need aws
if ! command -v pnpm >/dev/null 2>&1; then
  need npm
  npm i -g pnpm
fi

# Install workspace deps and build libs then app
pushd "$ROOT_DIR" >/dev/null
pnpm install --frozen-lockfile || pnpm install
pnpm --filter helios-scheduler --filter helios-ts build || true
popd >/dev/null

pushd "$APP_DIR" >/dev/null
pnpm build
popd >/dev/null

# Sync to S3
BUILD_DIR="$APP_DIR/dist"
[ -d "$BUILD_DIR" ] || { echo "Build dir not found: $BUILD_DIR" >&2; exit 1; }

# Upload all files first
aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME/" --delete --region "$AWS_REGION"

# Give long cache to versioned assets
if [ -d "$BUILD_DIR/assets" ]; then
  aws s3 sync "$BUILD_DIR/assets" "s3://$BUCKET_NAME/assets" \
    --delete \
    --region "$AWS_REGION" \
    --cache-control "max-age=31536000,public"
fi

# Upload HTML with short cache
find "$BUILD_DIR" -maxdepth 1 -type f -name "*.html" -print0 | while IFS= read -r -d '' file; do
  key=$(basename "$file")
  aws s3 cp "$file" "s3://$BUCKET_NAME/$key" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"
done

# Try to resolve distribution id from terraform outputs if not provided
if [ -z "$DIST_ID" ] && command -v terraform >/dev/null 2>&1 && [ -d "$TF_DIR" ]; then
  if terraform -chdir="$TF_DIR" output -raw study_planner_cloudfront_distribution_id >/dev/null 2>&1; then
    DIST_ID=$(terraform -chdir="$TF_DIR" output -raw study_planner_cloudfront_distribution_id || true)
  fi
fi

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$DIST_ID" ]; then
  echo "Creating CloudFront invalidation for /* on $DIST_ID"
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
else
  echo "No CloudFront distribution ID provided. Set STUDY_PLANNER_CLOUDFRONT_DISTRIBUTION_ID to invalidate cache."
fi

echo "Deployment completed to s3://$BUCKET_NAME"
