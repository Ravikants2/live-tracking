#!/usr/bin/env bash
set -euo pipefail

function error() {
  echo "ERROR: $*" >&2
  exit 1
}

function require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    error "Environment variable $name is required."
  fi
}

require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY
require_env AWS_REGION
require_env S3_BUCKET
require_env STACK_NAME
require_env DDB_TABLE

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="${SCRIPT_DIR}/.."
cd "$ROOT_DIR"

echo "Packaging Lambda..."
cd lambda
npm install
cd "$ROOT_DIR"
rm -f lambda.zip
zip -r lambda.zip lambda > /dev/null

if ! aws s3 ls "s3://$S3_BUCKET" >/dev/null 2>&1; then
  echo "Creating S3 bucket: $S3_BUCKET"
  aws s3 mb "s3://$S3_BUCKET"
fi

echo "Uploading Lambda package to s3://$S3_BUCKET/lambda.zip"
aws s3 cp lambda.zip "s3://$S3_BUCKET/lambda.zip"

echo "Deploying CloudFormation stack $STACK_NAME"
aws cloudformation deploy \
  --template-file template.yaml \
  --stack-name "$STACK_NAME" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameter-overrides LambdaS3Bucket="$S3_BUCKET" LambdaS3Key="lambda.zip" TableName="$DDB_TABLE" StageName="prod"

echo "Deployment complete. Fetching stack output..."
aws cloudformation describe-stacks --stack-name "$STACK_NAME" --query "Stacks[0].Outputs" --output table

echo "Done."
