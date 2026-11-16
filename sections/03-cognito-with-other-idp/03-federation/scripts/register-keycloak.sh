#!/usr/bin/env bash
# Keycloak を User Pool の外部 IdP（OIDC）として登録し、アプリのクライアントで選べるようにする。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
CLIENT_ID=$(grep '^COGNITO_CLIENT_ID=' .env | cut -d= -f2)

# ブラウザが通る authorize だけは localhost。token・userinfo・jwks は Floci がコンテナの中から呼ぶので、
# compose のサービス名 keycloak で書く（本物の Cognito なら、どれもインターネットから届く URL にする）
BROWSER=http://localhost:8080/realms/practice/protocol/openid-connect
BACKEND=http://keycloak:8080/realms/practice/protocol/openid-connect

aws cognito-idp create-identity-provider \
  --user-pool-id "$POOL_ID" \
  --provider-name Keycloak \
  --provider-type OIDC \
  --provider-details "client_id=cognito,client_secret=cognito-local-secret,authorize_scopes=openid email profile,oidc_issuer=http://localhost:8080/realms/practice,attributes_request_method=GET,authorize_url=$BROWSER/auth,token_url=$BACKEND/token,attributes_url=$BACKEND/userinfo,jwks_uri=$BACKEND/certs" \
  --attribute-mapping email=email,email_verified=email_verified,given_name=given_name,family_name=family_name,preferred_username=preferred_username,username=sub \
  > /dev/null

# UpdateUserPoolClient は「渡さなかった設定を既定に戻す」。今の設定を全部渡し直し、IdP の一覧に Keycloak を足す
aws cognito-idp update-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID" \
  --supported-identity-providers COGNITO Keycloak \
  --callback-urls http://localhost:3000/ \
  --logout-urls http://localhost:3000/ \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --query 'UserPoolClient.SupportedIdentityProviders'

# ログイン画面に「Keycloak でログイン」のボタンを出す
grep -q '^COGNITO_IDENTITY_PROVIDERS=' .env \
  && sed -i.bak 's/^COGNITO_IDENTITY_PROVIDERS=.*/COGNITO_IDENTITY_PROVIDERS=Keycloak/' .env && rm -f .env.bak \
  || echo 'COGNITO_IDENTITY_PROVIDERS=Keycloak' >> .env
echo "Keycloak を登録しました（API を起動し直すとボタンが出ます）"
