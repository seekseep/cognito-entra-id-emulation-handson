#!/usr/bin/env bash
# USER_PASSWORD_AUTH でログインし、トークン一式を .tokens.json に保存する。
# 使い方: bash scripts/login.sh <username> <password>
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

aws cognito-idp initiate-auth \
  --client-id "$CLIENT_ID" \
  --auth-flow USER_PASSWORD_AUTH \
  --auth-parameters "USERNAME=$1,PASSWORD=$2" \
  --query AuthenticationResult > .tokens.json
echo "saved .tokens.json"
