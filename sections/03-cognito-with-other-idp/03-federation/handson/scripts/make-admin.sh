#!/usr/bin/env bash
# 指定したユーザーを admin グループに入れる。使い方: bash scripts/make-admin.sh <Cognito のユーザー名>
# 外部 IdP から来たユーザーの名前は Keycloak_… や EntraID_… の形になる（npm run users で一覧できる）
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$1" --group-name admin
echo "$1 を admin グループに入れました（次にログインしたときのトークンから効きます）"
