#!/usr/bin/env bash
# Floci に User Pool・App Client・admin グループと、前のレクチャーで作った carol を用意し、API 用の .env を書き出す。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh

POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name app \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
  --auto-verified-attributes email \
  --query UserPool.Id --output text)

CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name app \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query UserPoolClient.ClientId --output text)

aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name admin > /dev/null

# 前のレクチャーの「サインアップ → 確認」を終えた状態の carol を作る。
# Floci のデータはメモリにあり、作り直すと消えるため。
aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username carol \
  --user-attributes Name=email,Value=carol@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --username carol \
  --password 'Passw0rd!' --permanent

cat > .env <<ENV
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
COGNITO_ENDPOINT=$AWS_ENDPOINT_URL
COGNITO_USER_POOL_ID=$POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
ENV
echo "wrote .env (pool: $POOL_ID, user: carol / Passw0rd!)"
# .env は API を起動したときにしか読まれない。古いプール ID のまま動き続けるのを防ぐため
echo "API（npm run start:dev）を起動中なら、止めて起動し直してください"
