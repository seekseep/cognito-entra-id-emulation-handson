---
title: App Client を作る
docs: true
---

# App Client を作る

![App Client を作る](./images/00-thumbnail.svg)

User Pool にログインしにくるアプリの登録が **App Client** です。前のレクチャーで作った User Pool に App Client を作ります。このレクチャーで作るファイルはありません。

## 準備

`handson/` で作業します。前のレクチャーから続けているなら、そのまま進めます。ターミナルを開き直したときは、`env.sh` を読み込み、User Pool の ID をシェル変数に入れ直します。

```bash
source ./env.sh
export POOL_ID=$(aws cognito-idp list-user-pools --max-results 10 --query 'UserPools[0].Id' --output text)
echo "$POOL_ID"
```

Floci を止めて User Pool が消えていたときは、前のレクチャーの手順で作り直してください。

## App Client を作る

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name practice-cli \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --prevent-user-existence-errors ENABLED \
  --query UserPoolClient.ClientId --output text
# 708d6652cba84996a62ac8cdde
```

- `--no-generate-secret` … クライアントシークレットを作りません。ブラウザやスマホのアプリは秘密を隠しておけないので、シークレットを持たせないのが基本です
- `--explicit-auth-flows` … このクライアントに許すログインの方法です。`ALLOW_USER_PASSWORD_AUTH` はユーザー名とパスワードをそのまま送る方法、`ALLOW_REFRESH_TOKEN_AUTH` はトークンの更新です
- `--prevent-user-existence-errors ENABLED` … ログインに失敗したとき、ユーザーが存在しないのか、パスワードが違うのかを区別して返さないようにします（Floci では効きません。05-01 の FAQ で扱います）

```bash "{直前の結果で出たクライアント ID}"
export CLIENT_ID={直前の結果で出たクライアント ID}
# 例: export CLIENT_ID=708d6652cba84996a62ac8cdde
```

## 作ったものを確かめる

```bash
aws cognito-idp describe-user-pool-client --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query 'UserPoolClient.{Name:ClientName,Flows:ExplicitAuthFlows,Secret:ClientSecret}'
```

`Flows` に 2 つのログインの方法が並び、`Secret` が `null`（シークレットなし）なら完成です。次のレクチャーで、ここまで手で打ったことをスクリプトにして、いつでも作り直せるようにします。

:::faq

### シークレットありのクライアントにするとどうなりますか？

ログインのたびに `SECRET_HASH`（ユーザー名・クライアント ID・シークレットから作るハッシュ）を送る必要があります。送らないと `InvalidParameterException: ... SECRET_HASH is required` になります。Floci もこれを本物どおりに拒否します。サーバーの中だけで使うクライアントなら、シークレットありにする意味があります。

### `ALLOW_USER_PASSWORD_AUTH` を付け忘れるとどうなりますか？

`initiate-auth` が `USER_PASSWORD_AUTH flow not enabled for this client` で拒否されます。本物の Cognito の既定は SRP（パスワードそのものを送らない方式）だけを許す設定です。

:::
