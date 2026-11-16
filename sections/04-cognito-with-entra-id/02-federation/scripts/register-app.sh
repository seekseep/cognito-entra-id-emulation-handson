#!/usr/bin/env bash
# entra-local に「Cognito から使うアプリ」を登録し、クライアント ID とシークレットを .entra.env に残す。
# Entra ポータルの「アプリの登録」→「新規登録」→「証明書とシークレット」に当たる操作。
set -euo pipefail
cd "$(dirname "$0")/.."
ENTRA=http://localhost:8443

# リダイレクト URI は Cognito（Floci）の idpresponse。本物なら https://<domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
APP_ID=$(curl -fsS -X POST "$ENTRA/admin/api/apps" -H 'content-type: application/json' -d '{
  "displayName": "Cognito (Floci)",
  "isConfidential": true,
  "redirectUris": [{ "uri": "http://localhost:4566/cognito-idp/oauth2/idpresponse", "type": "web" }]
}' | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s).id))")

# シークレットの値は作ったときに一度だけ返る（本物の Entra と同じ）。ここで控えておく
SECRET=$(curl -fsS -X POST "$ENTRA/admin/api/apps/$APP_ID/secrets" -H 'content-type: application/json' \
  -d '{"displayName":"cognito"}' | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s).secretText))")

cat > .entra.env <<ENV
export ENTRA_TENANT_ID=11111111-1111-1111-1111-111111111111
export ENTRA_CLIENT_ID=$APP_ID
export ENTRA_CLIENT_SECRET=$SECRET
ENV
echo "登録しました（クライアント ID: ${APP_ID}）。シークレットは .entra.env にあります"
