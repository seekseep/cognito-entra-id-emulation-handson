---
title: Hosted UI でログインする
docs: true
---

# Hosted UI でログインする

![Hosted UI でログインする](./images/00-thumbnail.svg)

前のセクションでは、画面がパスワードを受け取り、API が Cognito に渡していました。このセクションでは逆に、**アプリはパスワードに一切触らず**、ログイン画面ごと Cognito に任せます。Cognito が用意するログイン画面を **Hosted UI**（マネージドログイン）と呼びます。

外部の IdP（Keycloak・Entra ID）にログインを任せる「フェデレーション」も、この Hosted UI の仕組みの上に乗っています。まず Cognito 自身のユーザーで、この流れを通します。

このレクチャーでは、02 で作った画面に **「Hosted UI でログイン」のボタンを足します**。パスワードを受け取るフォームと `/auth/*` はそのまま残し、2 つのログインの方法を並べて見比べられるようにします。足す・変えるファイルは次のとおりです。

::changes

## 準備

`handson/` で作業します。前のレクチャーから続けているなら、`source` の行だけで構いません。Floci を止めていたときは、起動してから `npm run setup` で前のレクチャーを終えた状態を作り直します。

```bash
npm run up
npm run setup              # 前のレクチャーまでに作ったものを作り直す
source ./env.sh && source ./.cognito.env
```

## ブラウザから Floci を直接呼べるようにする

Hosted UI を使う画面は、discovery と `/oauth2/token` を **ブラウザから直接** 呼びます。オリジン（`localhost:3000` と `localhost:4566`）が違うので、Floci が CORS を許す必要があります。`compose.yaml` の `floci` に、許すオリジンを足します。

::file{path="compose.yaml"}

本物の Cognito のトークンエンドポイントは、最初から CORS に対応しています。

設定を変えたので Floci を作り直します。**作り直すと Floci のデータは消える** ので、`setup` をやり直します（ここで `setup.sh` を育ててきたことが効きます）。

```bash
npm run up
npm run setup
source ./.cognito.env      # 新しい User Pool の ID を読み直す
```

## クライアントに Hosted UI の設定を足す

01-01 で作った App Client は、パスワードを受け取るログイン（`USER_PASSWORD_AUTH`）だけを許しています。Hosted UI を使うには、認可コードフローと、ログイン後に戻ってよい先（コールバック URL）を足します。

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id "$POOL_ID" --client-id "$CLIENT_ID" \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --supported-identity-providers COGNITO \
  --callback-urls http://localhost:3000/ \
  --logout-urls http://localhost:3000/ \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client
```

- `--supported-identity-providers COGNITO` … ログイン画面で使えるのは Cognito 自身のユーザー（03-03 で Keycloak を足します）
- `--callback-urls` … ログイン後に戻ってよい先。ここに無い URL へは戻さない（コードを盗まれないため）
- `--allowed-o-auth-flows code` … 認可コードフローを許す

:::warning[UpdateUserPoolClient は全部を渡し直す]
`update-user-pool-client` は「渡さなかった設定を既定値に戻す」API です。Hosted UI の設定だけを渡すと、01-01 で付けた `--explicit-auth-flows` が消えて、パスワードでのログイン（CLI・`/auth/login`・E2E テスト）ができなくなります。足したい設定だけでなく、今の設定を全部渡し直します。本物の Cognito も同じです。
:::

これを **`scripts/update-client.sh`** にします。03-03 と 04-02 で外部 IdP を足すたびに、このスクリプトをもう一度流します。そのとき IdP の一覧を書き直さなくて済むよう、`--supported-identity-providers` には User Pool に登録してある IdP を全部並べるようにしてあります（今は 1 つも無いので `COGNITO` だけです）。

::file{path="scripts/update-client.sh"}

`package.json` に `update-client` を足し、`setup.sh` にも 1 行足します。`.env` を書き出す `write-api-env.sh` より前に置きます。

::file{path="package.json"}

::file{path="scripts/setup.sh"}

```bash
npm run update-client
```

## 画面にログイン先を教える

画面は「どの User Pool に、どのクライアントとして」ログインしに行くかを知る必要があります。値は API が持っているので、API に **`GET /config`** を足して返します。どれもブラウザに渡る値で、秘密ではありません。

::file{path="src/auth/config.controller.ts"}

::file{path="src/auth/auth.module.ts"}

`identityProviders` は、ログイン画面に並べる外部 IdP の名前です。03-03 から使います。設定（`cognito.config.ts`）で環境変数 `COGNITO_IDENTITY_PROVIDERS` から読み、`write-api-env.sh` が User Pool に登録してある IdP をそこに書きます。

::file{path="src/config/cognito.config.ts"}

::file{path="scripts/write-api-env.sh"}

::file{path=".env.example"}

```bash
npm run write-env
```

## 画面にボタンを足す

`public/index.html` に「Hosted UI でログイン」の欄と、ID トークンの中身を出す欄を足します。

::file{path="public/index.html"}

## 認可コードフローと PKCE

ボタンを押してから戻ってくるまでに、次のことが起きています（開発者ツールの Network タブで追えます）。

1. 画面が `code_verifier`（ランダムな文字列）を作り、そのハッシュ `code_challenge` を付けて `/oauth2/authorize` へ移る
2. Cognito がログイン画面を出し、ユーザーがパスワードを入れる
3. Cognito が **認可コード** を付けて、登録された戻り先（`http://localhost:3000/?code=...`）へ戻す
4. 画面が認可コードと `code_verifier` を `/oauth2/token` に送り、トークンを受け取る

認可コードは URL に載るので、横取りされるかもしれません。PKCE では、最初に送ったハッシュの元（`code_verifier`）を知っている人しかコードをトークンに換えられません。Floci も、`code_verifier` が合わないと `invalid_grant` を返します。

`public/main.js` の後ろに、この流れをライブラリなしで足します。

```js
const verifier = randomString();
const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
// ...
const url = new URL(discovery.authorization_endpoint);
url.search = new URLSearchParams({
  client_id: config.clientId, response_type: 'code', redirect_uri: redirectUri,
  scope: config.scope, state, code_challenge: challenge, code_challenge_method: 'S256',
});
location.assign(url);
```

認可・トークンのエンドポイントは、User Pool の discovery（`<iss>/.well-known/openid-configuration`）から読んでいます。Floci では `http://localhost:4566/cognito-idp/oauth2/authorize`、本物では `https://<ドメイン>.auth.<リージョン>.amazoncognito.com/oauth2/authorize` です。

トークンエンドポイントの応答は `id_token` のような snake_case なので、パスワードでログインしたときと同じ形（`idToken`）にそろえて持ちます。こうしておくと、`GET /me` などを呼ぶ部分は 02-04 のまま使えます。

::file{path="public/main.js"}

## 動かす

```bash
npm run start:dev
```

<http://localhost:3000> を開き、「Cognito のログイン画面へ」を押します。Floci のログイン画面に移るので、`alice` / `Passw0rd!` でサインインします。画面に戻ってきて、ID トークンの中身が表示されれば成功です。`GET /me` と `GET /admin/dashboard` も押してみてください。下の「パスワードでログイン」のフォームも、これまでどおり使えます。

## ログアウトとトークンの置き場所

画面はもらったトークンを `sessionStorage` に置き、「ログアウト」で次の 3 つをします。

1. `POST /auth/logout`（02-04 で作ったもの）でリフレッシュトークンを取り消す。Hosted UI でもらったトークンも同じクライアントのものなので、同じ API で取り消せます（ブラウザから `/oauth2/revoke` を直接呼んでも同じです）
2. 手元のトークンを消す
3. Cognito の `/logout` に移り、Hosted UI 側のログイン状態（Cookie）も消す（このレクチャーで足した部分）

1 を省くと、トークンが盗まれていた場合、ログアウトしたあとも使われ続けます。リフレッシュトークンは既定で 30 日有効なので、その間ずっとアクセストークンを取り直せてしまいます。

:::warning[本番でのトークンの置き場所]
`sessionStorage` は、ページに XSS があると JavaScript から読まれてしまう場所です。この画面のようにブラウザが `/oauth2/token` を直接呼ぶ作りでは、httpOnly の Cookie に置くことはできません。本番では、トークンの交換をサーバー側で行い、ブラウザとは httpOnly の Cookie のセッションでやり取りする形（BFF: Backend for Frontend）を検討してください。
:::

## API の Guard は変わらない

API 側の Guard は、02-02 の `CognitoJwtGuard` のままです。Hosted UI から出たトークンも、パスワード認証で出たトークンも、同じ User Pool・同じクライアントのアクセストークンだからです。API に増えたのは、画面に設定を渡す `/config` だけです。

本番で Hosted UI に寄せるなら、パスワードを受け取る `/auth/*` は消してしまえます。アプリがパスワードに一切触らなくなるのが、Hosted UI のいちばんの利点です。このハンズオンでは、見比べるためと、E2E テストで使うために残しています。

## このレクチャーを終えた handson/

::codeview

:::faq

### ログアウトしたのに、次のログインでパスワードを聞かれません

Hosted UI 側にもログイン状態（Cookie）が残っているからです。この画面のログアウトは、トークンを捨てたあと Cognito の `/logout` に移って、そちらの状態も消しています。

### `state` は何のためにありますか？

ログイン画面から戻ってきた応答が、自分が出した要求への応答かを確かめるためです。別のサイトに仕込まれたリンクから、攻撃者の認可コードで戻されるのを防ぎます（CSRF 対策）。

### 画面を開いたら何も表示されません

User Pool が無いと `/config` は返っても discovery が読めません。Floci を作り直したときは `npm run setup` をやり直し、API を再起動してください。

:::
