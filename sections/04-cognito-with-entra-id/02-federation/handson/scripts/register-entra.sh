#!/usr/bin/env bash
# entra-local を User Pool の外部 IdP（OIDC）として登録し、アプリのクライアントで選べるようにする。
# 先に npm run entra:register-app（Entra 側にアプリを登録する）を済ませておく。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.entra.env
source ./.cognito.env

# Entra のユーザー ID（oid）を入れておく場所を User Pool に足す。カスタム属性は足せるが、消したり型を変えたりはできない
if ! aws cognito-idp describe-user-pool --user-pool-id "$POOL_ID" \
  --query 'UserPool.SchemaAttributes[].Name' --output text | tr '\t' '\n' | grep -qx 'custom:entra_oid'; then
  aws cognito-idp add-custom-attributes --user-pool-id "$POOL_ID" \
    --custom-attributes Name=entra_oid,AttributeDataType=String,Mutable=true
fi

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

# アプリのクライアントで EntraID を選べるようにし、ログイン画面にボタンを出すため API の .env を書き直す
bash scripts/update-client.sh
bash scripts/write-api-env.sh
echo "EntraID を登録しました（API を起動し直すとボタンが出ます）"
