#!/usr/bin/env bash
# .tokens.json のリフレッシュトークンで、新しい ID / アクセストークンをもらう。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

REFRESH_TOKEN=$(node -e "console.log(require('./.tokens.json').RefreshToken)")
aws cognito-idp initiate-auth \
  --client-id "$CLIENT_ID" \
  --auth-flow REFRESH_TOKEN_AUTH \
  --auth-parameters "REFRESH_TOKEN=$REFRESH_TOKEN" \
  --query 'AuthenticationResult.{ExpiresIn:ExpiresIn,HasIdToken:IdToken!=null,HasRefreshToken:RefreshToken!=null}'
