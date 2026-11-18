---
title: Cognito 経由で Keycloak にログインする
docs: true
---

# Cognito 経由で Keycloak にログインする

![Cognito 経由で Keycloak にログインする](./images/00-thumbnail.svg)

Keycloak を Cognito の **外部 IdP** として登録し、「Keycloak でログイン」ボタンから Keycloak のユーザーでアプリに入れるようにします。アプリが受け取るのは、Keycloak のトークンではなく **Cognito のトークン** です。だから API は前のレクチャーのまま、何も変えずに動きます。

このレクチャーで足す・変えるファイルは次のとおりです。API と画面には手を入れません。03-01 でボタンを IdP の一覧から作るようにしておいたので、Cognito に Keycloak を登録するだけで「Keycloak でログイン」のボタンが出ます。

::changes

## 準備

`handson/` で作業します。前のレクチャーから続けているなら、`source` の行だけで構いません。Floci を止めていたときは、起動してから `npm run setup` で前のレクチャーを終えた状態を作り直します。

```bash
npm run up
npm run setup              # 前のレクチャーまでに作ったものを作り直す（Keycloak も起動している）
source ./env.sh && source ./.cognito.env
```

## 何が起きているか

![フェデレーションの流れ](./images/01-federation-flow.svg)

*図: 番号は下の手順に対応します。①〜④・⑥・⑦ はリダイレクトなので、ブラウザを経由します（`localhost` で届く住所）。⑤ だけが、Floci がコンテナの中から Keycloak を直接呼ぶ通信です（サービス名で届く住所）。*

1. 画面が `identity_provider=Keycloak` を付けて Cognito の `/oauth2/authorize` へ移る
2. Cognito は自分のログイン画面を出さず、Keycloak の `authorize_url` へ転送する
3. ユーザーが Keycloak でパスワードを入れる
4. Keycloak が認可コードを付けて、Cognito の `/oauth2/idpresponse` へ戻す
5. Cognito が Keycloak のトークンエンドポイントでコードをトークンに換え、userinfo で属性を読む
6. Cognito が User Pool にユーザーを作り（2 回目からは同じユーザーを更新し）、**自分の** 認可コードを付けてアプリへ戻す
7. アプリは前のレクチャーと同じく、Cognito の `/oauth2/token` でトークンをもらう

5 だけは Cognito（Floci）と Keycloak のサーバー同士の通信で、ブラウザは関わりません。この違いが、次の節で住所を 2 種類に書き分ける理由です。

## 外部 IdP を登録する

**`scripts/register-keycloak.sh`** を作ります。中心はこの 1 コマンドです。

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id "$POOL_ID" \
  --provider-name Keycloak \
  --provider-type OIDC \
  --provider-details "client_id=cognito,client_secret=cognito-local-secret,authorize_scopes=openid email profile,
      oidc_issuer=http://localhost:8080/realms/practice,attributes_request_method=GET,
      authorize_url=http://localhost:8080/realms/practice/protocol/openid-connect/auth,
      token_url=http://keycloak:8080/realms/practice/protocol/openid-connect/token,
      attributes_url=http://keycloak:8080/realms/practice/protocol/openid-connect/userinfo,
      jwks_uri=http://keycloak:8080/realms/practice/protocol/openid-connect/certs" \
  --attribute-mapping email=email,email_verified=email_verified,given_name=given_name,family_name=family_name,preferred_username=preferred_username,username=sub
```

（読みやすいように改行していますが、実際は 1 行です）

### エンドポイントを 2 種類の住所で書く

- `authorize_url` … **ブラウザ** が通るので `localhost:8080`
- `token_url`・`attributes_url`・`jwks_uri` … **Floci がコンテナの中から** 呼ぶので、compose のサービス名 `keycloak:8080`

本物の Cognito は AWS の中から呼ぶので、どれもインターネットから届く同じ URL にします。

### 本物の Cognito との違い

本物の Cognito は `oidc_issuer` だけを渡せば、登録のときに discovery を読みに行き、エンドポイントを自分で見つけます（届かなければ登録を拒否します）。Floci は登録のときに外へ問い合わせず、渡された値をそのまま覚えるだけなので、**エンドポイントを全部明示する** 必要があります。

### 属性のマッピング

`--attribute-mapping` は「Cognito の属性 = Keycloak の userinfo のクレーム」の対応です。`username=sub` で、Keycloak の `sub` を Cognito のユーザー名（本物の Cognito では `Keycloak_<sub>`）の元にしています。

### クライアントで Keycloak を選べるようにする

IdP を登録しただけでは、アプリのクライアントからは選べません。クライアントの `--supported-identity-providers` に Keycloak を足す必要があります。03-01 で作った `update-client.sh` は、User Pool に登録してある IdP を全部並べるので、**登録したあとにもう一度流すだけ** です。続けて `write-api-env.sh` を流すと、`.env` の `COGNITO_IDENTITY_PROVIDERS` に Keycloak が入り、画面にボタンが出ます。

`register-keycloak.sh` は、この 2 つを最後に呼びます。

::file{path="scripts/register-keycloak.sh"}

`package.json` に `register-keycloak` を足し、`setup.sh` にも 1 行足します。

::file{path="package.json"}

::file{path="scripts/setup.sh"}

## 動かす

```bash
npm run register-keycloak
npm run start:dev          # 起動していたら、止めて起動し直す（.env を読み直すため）
```

<http://localhost:3000> に「Keycloak でログイン」のボタンが増えています。押すと Keycloak のログイン画面に移るので、`kate` / `Passw0rd!` でサインインします。画面に戻ってきたら、ID トークンを見てください。

```json nofile
{
  "cognito:username": "Keycloak_1f4ba046-07b3-4adf-94bd-bc3a813c870e",
  "email": "kate@example.com",
  "identities": "[{\"userId\":\"3a0d6721-c5e8-4445-ad05-a120ed6fdf26\",\"providerName\":\"Keycloak\",\"providerType\":\"OIDC\", ...}]",
  "iss": "http://localhost:4566/ap-northeast-1_adbe51972"
}
```

`iss` は Cognito（Floci）です。Keycloak のユーザーが、Cognito の User Pool の中に `Keycloak_...` という名前で作られています。`identities` の `userId` が、Keycloak での kate の `sub` です。

:::notice[ユーザー名の後ろの値は、本物と Floci で違う]
本物の Cognito は、ユーザー名を `Keycloak_<Keycloak の sub>` にします（`identities` の `userId` と同じ値）。Floci はユーザー名の後ろに別の UUID を付けるので、上のように `cognito:username` と `userId` の値が食い違います。`make-admin` などでユーザー名を使うときは、ID トークンから組み立てず、`npm run users` の Username をそのまま使ってください。
:::


## Keycloak のユーザーを管理者にする

User Pool のユーザーを一覧する **`scripts/list-users.sh`** を作り、`npm run users` で呼べるようにします（`package.json` には上で足してあります）。`make-admin.sh` にも、外部 IdP のユーザー名の形をコメントで書き足しておきます。

::file{path="scripts/list-users.sh"}

::file{path="scripts/make-admin.sh"}

```bash
npm run users
# Keycloak_50a2c065-919d-400d-8da6-bfe889ca04b5 ...
```

```bash "{直前の結果で出た Keycloak_ で始まるユーザー名}"
export FEDERATED_USER={直前の結果で出た Keycloak_ で始まるユーザー名}
npm run make-admin "$FEDERATED_USER"
```

ログインし直すと `GET /admin/dashboard` が 200 になります。Keycloak 側の役割（ロール）は、自動では Cognito のグループになりません。Cognito のグループを Cognito 側で付けるか、属性として持ち込んで（カスタム属性 + マッピング）、アプリや Lambda で扱います。

Keycloak のユーザーを admin にしたのは確かめるための操作なので、`setup.sh` には足しません。kate は、Keycloak でログインしたときに Cognito に作られるユーザーです。Floci を作り直したら、もう一度ログインすれば作られます。

## コラム: アプリが Keycloak に直結する場合と比べる

Cognito を挟まず、アプリが Keycloak に直接ログインしにいく作りもできます。そうすると、この Cognito が肩代わりしていたことを、アプリが自分でやることになります。

| | Cognito を挟む | アプリが直結する |
|---|---|---|
| API が確かめるトークン | いつも Cognito のトークン | IdP ごとに違う（`iss`・`aud`・ロールの場所が違う） |
| IdP を増やす | Cognito に登録するだけ。API は変えない | API の検証を IdP ごとに増やす |
| ユーザーの台帳 | Cognito の User Pool にまとまる | IdP ごとに分かれる |
| 自前のパスワードユーザーとの混在 | そのまま混ぜられる | 別に作る |

## このレクチャーを終えた handson/

::codeview

:::faq

### `Identity provider token exchange failed` と表示されます

Cognito（Floci）が Keycloak のトークンエンドポイントでコードを換えられなかった、という意味です。次を確かめてください。

- `token_url` が `keycloak:8080` になっているか（`localhost` だと Floci のコンテナ自身を指してしまう）
- Keycloak のクライアントシークレットと、登録した `client_secret` が同じか
- ほかのプログラム（別の Floci や LocalStack）が 4566 番を使っていないか（確かめ方は [道具をそろえる](../../00-setup/01-tools/LECTURE.md) の「同じポートを使うほかのプログラム」）

### `Identity provider claims request failed` と表示されます

userinfo の呼び出しに失敗しています。Keycloak の `KC_HOSTNAME` を外すと、Floci が受け取るトークンの `iss` が `http://keycloak:8080/...` になり、userinfo に拒否されてこのエラーになります。

### 同じ人が 2 回ログインすると、ユーザーが 2 人になりませんか？

なりません。Cognito は Keycloak の `sub`（`identities` の `userId`）で同じユーザーを探し、属性を更新します。Floci でも 2 回目のログインで同じユーザー名のユーザーが使われることを確かめています（`npm run users` で確かめられます）。

:::
