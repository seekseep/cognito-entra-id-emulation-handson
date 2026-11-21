#!/usr/bin/env bash
# User Pool のユーザーを、状態やメールと一緒に並べる。外部 IdP から来たユーザーは EXTERNAL_PROVIDER になる。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env
aws cognito-idp list-users --user-pool-id "$POOL_ID" \
  --query 'Users[].{Username:Username,Status:UserStatus,Email:Attributes[?Name==`email`]|[0].Value,EntraOid:Attributes[?Name==`custom:entra_oid`]|[0].Value}' --output table
