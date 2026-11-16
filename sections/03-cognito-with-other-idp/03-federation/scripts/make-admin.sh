#!/usr/bin/env bash
# User Pool のユーザーを admin グループに入れる。使い方: bash scripts/make-admin.sh <Cognito のユーザー名>
# Keycloak から来たユーザーの名前は Keycloak_<sub> の形になる（npm run users で一覧できる）
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$1" --group-name admin
echo "$1 を admin グループに入れました（次にログインしたときのトークンから効きます）"
