#!/usr/bin/env bash
# User Pool と App Client を作り、ID を .cognito.env に書き出す。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh

POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name practice \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
  --auto-verified-attributes email \
  --query UserPool.Id --output text)

# ブラウザや CLI から使うクライアントはシークレットを持たせない（秘密を守れないため）
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name practice-cli \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --query UserPoolClient.ClientId --output text)

cat > .cognito.env <<ENV
export POOL_ID=$POOL_ID
export CLIENT_ID=$CLIENT_ID
ENV
cat .cognito.env
