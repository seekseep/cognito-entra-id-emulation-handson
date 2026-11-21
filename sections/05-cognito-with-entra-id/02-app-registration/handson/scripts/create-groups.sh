#!/usr/bin/env bash
# admin グループを作って alice を入れる。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name admin \
  --description '管理者' > /dev/null
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" \
  --username alice --group-name admin
aws cognito-idp admin-list-groups-for-user --user-pool-id "$POOL_ID" \
  --username alice --query 'Groups[].GroupName'
