#!/usr/bin/env bash
# 登録したアプリで、指定したユーザーがサインインしたら出る ID トークンの中身を見る（entra-local の管理 API）。
# 使い方: bash scripts/preview-token.sh <userPrincipalName>（ENTRA_ENV=<控えのファイル> で対象のアプリを変えられる）
set -euo pipefail
cd "$(dirname "$0")/.."
# 見比べるために別のアプリの控えを使いたいときは ENTRA_ENV=.entra.a.env のように渡す
source "${ENTRA_ENV:-./.entra.env}"
ENTRA=http://localhost:8443
USER_ID=$(curl -fsS "$ENTRA/admin/api/users?search=$1" | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.parse(s).value[0].id))")
curl -fsS -X POST "$ENTRA/admin/api/apps/$ENTRA_CLIENT_ID/token-preview" -H 'content-type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"tokenType\":\"idToken\"}" | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>console.log(JSON.stringify(JSON.parse(s),null,2)))"
