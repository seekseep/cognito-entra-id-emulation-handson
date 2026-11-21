#!/usr/bin/env bash
# entra-local にユーザーを作る。使い方: bash scripts/entra-create-user.sh <名前（英小文字）> <表示名>
# entra-local のデータはボリュームに残るので、既にいるときは作らずにそのユーザーを表示する。
set -euo pipefail
NAME=$1
DISPLAY=${2:-$1}
UPN="$NAME@entralocal.dev"
ENTRA=http://localhost:8443

BODY=$(mktemp)
trap 'rm -f "$BODY"' EXIT
STATUS=$(curl -sS -o "$BODY" -w '%{http_code}' -X POST "$ENTRA/admin/api/users" -H 'content-type: application/json' -d "{
  \"userPrincipalName\": \"$UPN\",
  \"displayName\": \"$DISPLAY\",
  \"mail\": \"$UPN\",
  \"password\": \"Passw0rd!\"
}")

case "$STATUS" in
  201)
    jq '{ id, userPrincipalName }' "$BODY"
    ;;
  409)
    echo "$UPN は既にいます（entra-local のデータはボリュームに残ります）"
    curl -fsS "$ENTRA/admin/api/users" | jq --arg upn "$UPN" '.value[] | select(.userPrincipalName == $upn) | { id, userPrincipalName }'
    ;;
  *)
    echo "ユーザーを作れませんでした（HTTP $STATUS）" >&2
    cat "$BODY" >&2
    exit 1
    ;;
esac
