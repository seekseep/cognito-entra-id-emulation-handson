---
title: App Client を作る
docs: true
---

# App Client を作る

![App Client を作る](./images/00-thumbnail.svg)

User Pool にログインしにくるアプリの登録が **App Client** です。前のレクチャーで作った User Pool に App Client を作り、そのあと、User Pool と App Client をいつでも作り直せるようにスクリプトにします。足すファイルは次のとおりです。

::changes

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
- `--prevent-user-existence-errors ENABLED` … ログインに失敗したとき、ユーザーが存在しないのか、パスワードが違うのかを区別して返さないようにします（Floci では効きません。04-01 の FAQ で扱います）

```bash "{直前の結果で出たクライアント ID}"
export CLIENT_ID={直前の結果で出たクライアント ID}
# 例: export CLIENT_ID=708d6652cba84996a62ac8cdde
```

## 作ったものを確かめる

```bash
aws cognito-idp describe-user-pool-client --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --query 'UserPoolClient.{Name:ClientName,Flows:ExplicitAuthFlows,Secret:ClientSecret}'
```

## スクリプトにする

Floci のデータはメモリにあるので、コンテナを止めると User Pool は消えます。そのたびに打ち直さなくて済むよう、前のレクチャーとこのレクチャーで打った 2 つのコマンドを **`scripts/create-user-pool.sh`** にします。

要点は 2 つです。

- コマンドの出力（ID）を `$(...)` で変数に受ける。手で `export` していた所が要らなくなります
- 最後に ID を **`.cognito.env`** に書き出す。この先のスクリプトは、ここから User Pool とクライアントの ID を読みます

```bash
cat > .cognito.env <<ENV
export POOL_ID=$POOL_ID
export CLIENT_ID=$CLIENT_ID
ENV
```

::file{path="scripts/create-user-pool.sh"}

`.cognito.env` は手元の環境ごとに中身が違うファイルなので、git に入れないよう **`.gitignore`** を作って書いておきます。このあとのレクチャーでも、トークンやシークレットを書いたファイルをここに足していきます。

::file{path=".gitignore"}

## 作り直すスクリプトを用意する

もう 1 つ、**`scripts/setup.sh`** を作ります。いまは `create-user-pool.sh` を呼ぶだけですが、これから **レクチャーを 1 つ終えるたびに、そのレクチャーで作ったものを作るスクリプトを 1 行ずつ足していきます**。こうしておくと、Floci を作り直しても `bash scripts/setup.sh` 1 回で「前のレクチャーを終えた状態」に戻れます。

::file{path="scripts/setup.sh"}

動かして確かめます。Floci を作り直して（User Pool が消える）、`setup` で作り直します。

```bash
podman compose down
podman compose up -d
bash scripts/setup.sh
source ./.cognito.env
echo "$POOL_ID $CLIENT_ID"
```

新しい ID が出れば完成です。ターミナルを開き直したときも、`source ./env.sh && source ./.cognito.env` で同じ値に戻せます。

## このレクチャーを終えた handson/

::codeview

:::faq

### シークレットありのクライアントにするとどうなりますか？

ログインのたびに `SECRET_HASH`（ユーザー名・クライアント ID・シークレットから作るハッシュ）を送る必要があります。送らないと `InvalidParameterException: ... SECRET_HASH is required` になります。Floci もこれを本物どおりに拒否します。サーバーの中だけで使うクライアントなら、シークレットありにする意味があります。

### `ALLOW_USER_PASSWORD_AUTH` を付け忘れるとどうなりますか？

`initiate-auth` が `USER_PASSWORD_AUTH flow not enabled for this client` で拒否されます。本物の Cognito の既定は SRP（パスワードそのものを送らない方式）だけを許す設定です。

### `bash: scripts/setup.sh: No such file or directory` と出ます

`handson/` の中で実行しているかを確かめてください。

:::
