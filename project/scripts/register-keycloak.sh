#!/usr/bin/env bash
# Keycloak を User Pool の外部 IdP（OIDC）として登録し、アプリのクライアントで選べるようにする。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

# ブラウザが通る authorize だけは localhost。token・userinfo・jwks は Floci がコンテナの中から呼ぶので、
# compose のサービス名 keycloak で書く（本物の Cognito なら、どれもインターネットから届く URL にする）
BROWSER=http://localhost:8080/realms/practice/protocol/openid-connect
BACKEND=http://keycloak:8080/realms/practice/protocol/openid-connect

DETAILS="client_id=cognito,client_secret=cognito-local-secret,authorize_scopes=openid email profile,oidc_issuer=http://localhost:8080/realms/practice,attributes_request_method=GET,authorize_url=$BROWSER/auth,token_url=$BACKEND/token,attributes_url=$BACKEND/userinfo,jwks_uri=$BACKEND/certs"
MAPPING="email=email,email_verified=email_verified,given_name=given_name,family_name=family_name,preferred_username=preferred_username,username=sub"

# もう一度実行したときに重複で止まらないよう、登録済みなら作り直さずに設定を上書きする
if aws cognito-idp describe-identity-provider --user-pool-id "$POOL_ID" --provider-name Keycloak > /dev/null 2>&1; then
  aws cognito-idp update-identity-provider --user-pool-id "$POOL_ID" --provider-name Keycloak \
    --provider-details "$DETAILS" --attribute-mapping "$MAPPING" > /dev/null
else
  aws cognito-idp create-identity-provider --user-pool-id "$POOL_ID" --provider-name Keycloak --provider-type OIDC \
    --provider-details "$DETAILS" --attribute-mapping "$MAPPING" > /dev/null
fi

# アプリのクライアントで Keycloak を選べるようにし（update-client.sh は登録済みの IdP を全部並べる）、
# ログイン画面にボタンを出すため API の .env を書き直す
bash scripts/update-client.sh
bash scripts/write-api-env.sh
echo "Keycloak を登録しました（API を起動し直すとボタンが出ます）"
