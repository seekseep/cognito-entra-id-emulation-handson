#!/usr/bin/env bash
# .cognito.env（01-cognito で作った User Pool とクライアント）から、API が読む .env を書き出す。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

# @since 03-01
# ログイン画面に並べる外部 IdP。User Pool に登録してあるものを、そのままカンマ区切りで並べる
PROVIDERS=$(aws cognito-idp list-identity-providers --user-pool-id "$POOL_ID" \
  --query 'Providers[].ProviderName' --output text | tr '\t' ',')
# @end

cat > .env <<ENV
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
COGNITO_ENDPOINT=$AWS_ENDPOINT_URL
COGNITO_USER_POOL_ID=$POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
COGNITO_IDENTITY_PROVIDERS=$PROVIDERS # @since 03-01
ENV
echo "wrote .env (pool: $POOL_ID)"
# .env は API を起動したときにしか読まれない。古いプール ID のまま動き続けるのを防ぐため
echo "API（npm run start:dev）を起動中なら、止めて起動し直してください"
