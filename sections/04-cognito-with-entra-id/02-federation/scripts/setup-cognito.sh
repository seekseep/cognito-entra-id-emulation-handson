#!/usr/bin/env bash
# Hosted UI を使う User Pool とクライアントを作り、alice（admin グループ）を用意して .env を書き出す。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh

# custom:entra_oid は Entra のユーザー ID（oid）を入れておく場所。カスタム属性は後から型を変えられない
POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name entra-federation \
  --auto-verified-attributes email \
  --schema Name=entra_oid,AttributeDataType=String,Mutable=true \
  --query UserPool.Id --output text)

# Hosted UI を使うクライアント。認可コードフローを許し、ログイン後の戻り先を登録する。
# ブラウザで動くのでシークレットは持たせず、代わりに PKCE を使う
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name spa \
  --no-generate-secret \
  --supported-identity-providers COGNITO \
  --callback-urls http://localhost:3000/ \
  --logout-urls http://localhost:3000/ \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --query UserPoolClient.ClientId --output text)

aws cognito-idp create-group --user-pool-id "$POOL_ID" --group-name admin > /dev/null

# 練習用のユーザー。初回のパスワード変更を飛ばすため、パスワードを確定済みにする
aws cognito-idp admin-create-user --user-pool-id "$POOL_ID" --username alice \
  --user-attributes Name=email,Value=alice@example.com Name=email_verified,Value=true \
  --message-action SUPPRESS > /dev/null
aws cognito-idp admin-set-user-password --user-pool-id "$POOL_ID" --username alice \
  --password 'Passw0rd!' --permanent
aws cognito-idp admin-add-user-to-group --user-pool-id "$POOL_ID" --username alice --group-name admin

cat > .env <<ENV
AWS_REGION=$AWS_REGION
COGNITO_ENDPOINT=$AWS_ENDPOINT_URL
COGNITO_USER_POOL_ID=$POOL_ID
COGNITO_CLIENT_ID=$CLIENT_ID
ENV
echo "wrote .env (pool: $POOL_ID / user: alice, Passw0rd!)"
