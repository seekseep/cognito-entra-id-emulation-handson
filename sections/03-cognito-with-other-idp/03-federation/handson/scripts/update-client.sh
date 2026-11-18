#!/usr/bin/env bash
# App Client に、Hosted UI（認可コードフロー）でログインするための設定を足す。
# UpdateUserPoolClient は「渡さなかった設定を既定値に戻す」API なので、毎回すべての設定を渡し直す。
set -euo pipefail
cd "$(dirname "$0")/.."
source ./env.sh
source ./.cognito.env

# Cognito 自身のログイン画面（COGNITO）と、User Pool に登録してある外部 IdP を全部選べるようにする
PROVIDERS=$(aws cognito-idp list-identity-providers --user-pool-id "$POOL_ID" \
  --query 'Providers[].ProviderName' --output text)

ARGS=(
  --user-pool-id "$POOL_ID"
  --client-id "$CLIENT_ID"
  # 01-cognito で付けたログインの方法。渡し直さないと消えて、CLI や API からログインできなくなる
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH
  --supported-identity-providers COGNITO $PROVIDERS
  # ログインのあとに戻ってくる URL。ここに無い URL へは戻せない（認可コードを盗まれないため）
  --callback-urls http://localhost:3000/
  --logout-urls http://localhost:3000/
  --allowed-o-auth-flows code
  --allowed-o-auth-scopes openid email profile
  --allowed-o-auth-flows-user-pool-client
)

aws cognito-idp update-user-pool-client "${ARGS[@]}" \
  --query 'UserPoolClient.{IdPs:SupportedIdentityProviders,Callback:CallbackURLs,Flows:AllowedOAuthFlows}'
