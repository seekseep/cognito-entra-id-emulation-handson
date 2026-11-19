#!/usr/bin/env bash
# entra-local のテナントの discovery から、Cognito に登録するときに使う値を抜き出す。
set -euo pipefail
curl -fsS http://localhost:8443/11111111-1111-1111-1111-111111111111/v2.0/.well-known/openid-configuration | node -e "
let s = '';
process.stdin.on('data', (d) => (s += d)).on('end', () => {
  const d = JSON.parse(s);
  for (const key of ['issuer', 'authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri']) console.log(key.padEnd(24), d[key]);
});"
