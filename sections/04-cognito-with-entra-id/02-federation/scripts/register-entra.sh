#!/usr/bin/env bash
# entra-local を User Pool の外部 IdP（OIDC）として登録し、アプリのクライアントで選べるようにする。
# 先に npm run setup（Cognito 側）と npm run register-app（Entra 側）を済ませておく。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.entra.env
POOL_ID=$(grep '^COGNITO_USER_POOL_ID=' .env | cut -d= -f2)
CLIENT_ID=$(grep '^COGNITO_CLIENT_ID=' .env | cut -d= -f2)

# v2.0 の issuer はテナントごとに決まる。マルチテナントの common ではなく、自分のテナント ID を入れる
ISSUER=http://localhost:8443/$ENTRA_TENANT_ID/v2.0
# ブラウザが通る authorize だけは localhost。ほかは Floci がコンテナの中から、サービス名 entra-local で呼ぶ
BROWSER=http://localhost:8443
BACKEND=http://entra-local:8443

DETAILS="client_id=$ENTRA_CLIENT_ID,client_secret=$ENTRA_CLIENT_SECRET,authorize_scopes=openid email profile,oidc_issuer=$ISSUER,attributes_request_method=GET,authorize_url=$BROWSER/$ENTRA_TENANT_ID/oauth2/v2.0/authorize,token_url=$BACKEND/$ENTRA_TENANT_ID/oauth2/v2.0/token,attributes_url=$BACKEND/graph/oidc/userinfo,jwks_uri=$BACKEND/$ENTRA_TENANT_ID/discovery/v2.0/keys"
MAPPING="email=email,name=name,preferred_username=preferred_username,custom:entra_oid=oid,username=sub"

# もう一度実行したときに重複で止まらないよう、登録済みなら作り直さずに設定を上書きする
if aws cognito-idp describe-identity-provider --user-pool-id "$POOL_ID" --provider-name EntraID > /dev/null 2>&1; then
  aws cognito-idp update-identity-provider --user-pool-id "$POOL_ID" --provider-name EntraID \
    --provider-details "$DETAILS" --attribute-mapping "$MAPPING" > /dev/null
else
  aws cognito-idp create-identity-provider --user-pool-id "$POOL_ID" --provider-name EntraID --provider-type OIDC \
    --provider-details "$DETAILS" --attribute-mapping "$MAPPING" > /dev/null
fi

# UpdateUserPoolClient は「渡さなかった設定を既定に戻す」。今の設定を全部渡し直し、IdP の一覧に EntraID を足す
aws cognito-idp update-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-id "$CLIENT_ID" \
  --supported-identity-providers COGNITO EntraID \
  --callback-urls http://localhost:3000/ \
  --logout-urls http://localhost:3000/ \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --read-attributes email email_verified name preferred_username custom:entra_oid \
  --query 'UserPoolClient.SupportedIdentityProviders'

grep -q '^COGNITO_IDENTITY_PROVIDERS=' .env \
  && sed -i.bak 's/^COGNITO_IDENTITY_PROVIDERS=.*/COGNITO_IDENTITY_PROVIDERS=EntraID/' .env && rm -f .env.bak \
  || echo 'COGNITO_IDENTITY_PROVIDERS=EntraID' >> .env
echo "EntraID を登録しました（API を起動し直すとボタンが出ます）"
