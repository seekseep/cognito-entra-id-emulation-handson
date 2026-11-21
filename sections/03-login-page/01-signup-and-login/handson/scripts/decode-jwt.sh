#!/usr/bin/env bash
# JWT のヘッダーとペイロードを読む。署名は確かめない（読むだけ）。
# 使い方: bash scripts/decode-jwt.sh <token>   または   echo <token> | bash scripts/decode-jwt.sh
set -euo pipefail

TOKEN=${1:-$(cat)}

# JWT は「ヘッダー.ペイロード.署名」。前の 2 つは base64url で符号化した JSON。
# base64url を普通の base64 の文字（+ と /）に戻してから @base64d で戻す。
# iat / exp は UNIX 秒なので、読める形を横に添える
printf '%s' "$TOKEN" | jq -R '
  def decode: gsub("-"; "+") | gsub("_"; "/") | @base64d | fromjson;
  def readable: reduce ("iat", "auth_time", "exp") as $key (.;
    if .[$key] then .["\($key) (読める形)"] = (.[$key] | todate) else . end);
  split(".") | { header: (.[0] | decode), payload: (.[1] | decode | readable) }'
