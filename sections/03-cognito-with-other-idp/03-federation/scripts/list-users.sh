#!/usr/bin/env bash
# User Pool のユーザーを、どこから来たか（UserStatus と identities）と一緒に並べる。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
aws cognito-idp list-users --user-pool-id "$POOL_ID" \
  --query 'Users[].{Username:Username,Status:UserStatus,Email:Attributes[?Name==`email`]|[0].Value}' --output table
