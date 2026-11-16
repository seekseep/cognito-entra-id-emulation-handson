#!/usr/bin/env bash
# Floci の SES に届いた確認メールから、指定したアドレス宛ての最新の 6 桁コードを取り出す。
# 使い方: bash scripts/read-code.sh <email>
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
curl -s "$AWS_ENDPOINT_URL/_aws/ses" | node -e "
let s = '';
process.stdin.on('data', (d) => (s += d)).on('end', () => {
  const mail = JSON.parse(s).messages.filter((m) => m.Destination.ToAddresses.includes(process.argv[1])).at(-1);
  const code = mail?.Body.text_part?.match(/\d{6}/)?.[0];
  if (!code) { console.error('確認コードが見つかりません'); process.exit(1); }
  console.log(code);
});" "$1"
