#!/usr/bin/env bash
# 指定したユーザーを admin グループに入れる。使い方: bash scripts/make-admin.sh <username>
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username "$1" --group-name admin
echo "$1 を admin グループに入れました（新しいトークンから反映されます）"
