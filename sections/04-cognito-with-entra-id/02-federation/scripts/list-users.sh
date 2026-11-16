#!/usr/bin/env bash
# User Pool のユーザーを、Entra の oid（custom:entra_oid）と一緒に並べる。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
aws cognito-idp list-users --user-pool-id "$POOL_ID" \
  --query 'Users[].{Username:Username,Email:Attributes[?Name==`email`]|[0].Value,EntraOid:Attributes[?Name==`custom:entra_oid`]|[0].Value}' --output table
