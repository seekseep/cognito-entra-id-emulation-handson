#!/usr/bin/env bash
# Keycloak の practice realm の discovery から、Cognito に登録するときに使う値を抜き出す。
set -euo pipefail
curl -s http://localhost:8080/realms/practice/.well-known/openid-configuration | node -e "
let s = '';
process.stdin.on('data', (d) => (s += d)).on('end', () => {
  const d = JSON.parse(s);
  const pick = ['issuer', 'authorization_endpoint', 'token_endpoint', 'userinfo_endpoint', 'jwks_uri'];
  for (const key of pick) console.log(key.padEnd(24), d[key]);
});"
