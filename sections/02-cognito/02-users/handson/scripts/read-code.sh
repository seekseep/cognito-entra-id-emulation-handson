#!/usr/bin/env bash
# Floci の SES に届いた確認メールから、指定したアドレス宛ての最新の 6 桁コードを取り出す。
# 使い方: bash scripts/read-code.sh <email>
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh

curl -fsS "$AWS_ENDPOINT_URL/_aws/ses" | jq -er --arg to "$1" '
  [.messages[] | select(.Destination.ToAddresses | index($to))] | last
  | .Body.text_part // "" | capture("(?<code>[0-9]{6})").code' \
  || { echo '確認コードが見つかりません' >&2; exit 1; }
