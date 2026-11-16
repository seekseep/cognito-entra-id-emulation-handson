#!/usr/bin/env bash
# entra-local にユーザーを作る。使い方: bash scripts/create-user.sh <名前（英小文字）> <表示名>
set -euo pipefail
NAME=$1
DISPLAY=${2:-$1}
curl -fsS -X POST http://localhost:8443/admin/api/users -H 'content-type: application/json' -d "{
  \"userPrincipalName\": \"$NAME@entralocal.dev\",
  \"displayName\": \"$DISPLAY\",
  \"mail\": \"$NAME@entralocal.dev\",
  \"password\": \"Passw0rd!\"
}" | node -e "let s='';process.stdin.on('data',(d)=>(s+=d)).on('end',()=>{const u=JSON.parse(s);console.log({ id: u.id, userPrincipalName: u.userPrincipalName })})"
