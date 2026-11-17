---
title: 認証 API を作る
docs: true
---

# 認証 API を作る

![認証 API を作る](./images/00-thumbnail.svg)

前のセクションで aws CLI から打っていた操作を、NestJS の API にします。`POST /auth/signup`・`/auth/confirm`・`/auth/login`・`/auth/refresh` の 4 つです。Cognito の SDK は **エンドポイントを差し替えるだけで Floci に向く** ので、コードは本番の Cognito に向けるときとまったく同じです。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

## 動かす

```bash
npm install
npm run floci:up
npm run setup          # User Pool・App Client・admin グループを作り、.env を書き出す
npm run start:dev      # http://localhost:3000
```

別のターミナルから呼んでみます。

```bash
curl -s -X POST localhost:3000/auth/signup -H 'content-type: application/json' \
  -d '{"username":"carol","email":"carol@example.com","password":"Passw0rd!"}'
# {"userSub":"...","confirmed":false}

curl -s localhost:4566/_aws/ses | grep -o 'code is [0-9]*' | tail -1   # 確認コードを読む
curl -s -X POST localhost:3000/auth/confirm -H 'content-type: application/json' \
  -d '{"username":"carol","code":"123456"}'                            # 読んだコードに置き換える

curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"username":"carol","password":"Passw0rd!"}'
# {"idToken":"eyJ...","accessToken":"eyJ...","refreshToken":"...","expiresIn":3600}
```

## 構成

```text
src/
  main.ts                     起動
  app.module.ts               ConfigModule と AuthModule を組み立てる
  config/cognito.config.ts    環境変数 → 設定
  auth/
    auth.module.ts
    auth.controller.ts        /auth/* の 4 つ
    auth.service.ts           Cognito SDK を呼ぶ
    cognito-error.filter.ts   Cognito の例外 → HTTP のステータス
scripts/setup-cognito.sh      Floci に User Pool を作って .env を書く
```

NestJS は TypeScript で書いています（NestJS 12 の標準の構成）。

## 設定（ConfigModule）

[src/config/cognito.config.ts](./src/config/cognito.config.ts) は、環境変数から設定を組み立てます。

```ts
const endpoint = process.env.COGNITO_ENDPOINT || undefined;
const issuer = process.env.COGNITO_ISSUER
  ?? `${endpoint ?? `https://cognito-idp.${region}.amazonaws.com`}/${userPoolId}`;
```

`COGNITO_ENDPOINT` があれば Floci、無ければ本物の Cognito です。トークンの発行者（`iss`）は「エンドポイント/プール ID」の形で、Floci も本物も同じ組み立て方で決まります。`npm run setup` が書き出す `.env` はこうなります。

```bash
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
COGNITO_ENDPOINT=http://localhost:4566
COGNITO_USER_POOL_ID=ap-northeast-1_xxxxxxxxx
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

`AWS_ACCESS_KEY_ID`・`AWS_SECRET_ACCESS_KEY` の `test` は Floci 用のダミーです。AWS の SDK は認証情報が無いと動かないので入れていますが、Floci は値を確かめません。本物の Cognito に切り替えるときは消します（[04-frontend-and-container](../04-frontend-and-container/LECTURE.md) で扱います）。

## Cognito SDK を呼ぶ（AuthService）

[src/auth/auth.service.ts](./src/auth/auth.service.ts) で、SDK のクライアントを作るときに `endpoint` を渡します。

```ts
this.client = new CognitoIdentityProviderClient({
  region: config.region,
  endpoint: config.endpoint,   // undefined なら本物の Cognito
});
```

ログインは CLI と同じ `InitiateAuth` です。管理者が作ったユーザーの初回ログインでは、トークンの代わりにチャレンジが返るので、そのまま返しています。

```ts
if (result.ChallengeName) {
  return { challenge: result.ChallengeName, session: result.Session };
}
```

## Cognito のエラーを HTTP にする

SDK は Cognito のエラーを `NotAuthorizedException` などの名前付きの例外で投げます。そのままでは 500 になってしまうので、[src/auth/cognito-error.filter.ts](./src/auth/cognito-error.filter.ts) の例外フィルターで HTTP のステータスに変えます。

| Cognito の例外 | HTTP |
|---|---|
| `NotAuthorizedException`・`UserNotFoundException` | 401（どちらも同じ文言） |
| `UserNotConfirmedException` | 403（登録済みだと分かる） |
| `UsernameExistsException` | 409（登録済みだと分かる） |
| `InvalidPasswordException`・`CodeMismatchException` など | 400 |
| `ResourceNotFoundException`（User Pool やクライアントが無い） | 500 |
| それ以外 | 502 |

パスワード違いと、存在しないユーザーを **同じ 401・同じ文言** にしているのが大事なところです。分けて返すと「このユーザー名は登録されている」ことが外から分かってしまいます。例外の名前も応答には含めず、ログにだけ残します。

```bash
curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' -d '{"username":"carol","password":"wrong"}'
curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' -d '{"username":"nobody","password":"wrong"}'
# どちらも {"statusCode":401,"message":"ユーザー名かパスワードが違います"}
```

:::warning[ログインを 401 にそろえても、サインアップでは存在が分かる]
`POST /auth/signup` に既にあるユーザー名を送ると 409 が返るので、ログインとは別の入口から「登録されているか」を確かめられてしまいます。未確認のユーザーでのログインに返す 403 も同じです。Cognito の `PreventUserExistenceErrors` もサインアップには効きません。

このハンズオンでは分かりやすさを優先して 409 を返しています。ユーザー名を探られたくないサービスでは、次のような対策を組み合わせます。

- メールアドレスをユーザー名にし、サインアップの応答は登録済みでもいつも同じにする。登録済みの人には「既に登録されています」というメールを送る
- サインアップ・ログインの API に回数制限をかける（API Gateway のスロットリングや AWS WAF のレートベースのルールなど）
:::

:::faq

### `.env` が無いと言われて起動しません

`npm run setup` を先に実行してください。Floci を作り直すと User Pool は消えるので、そのときも `npm run setup` をやり直します（プール ID が変わるので `.env` も書き直されます）。

### setup をやり直したら、API が 500 や 401 を返すようになりました

API を起動し直してください。`.env` は API を起動したときに一度だけ読まれ、`npm run start:dev` の自動再起動も `src/` の変更しか見ていません。起動し直すまで、API は消えた古い User Pool に問い合わせ続けます。ログインは 500（`API の Cognito の設定が正しくありません`）、`/me` はトークンの `iss` が合わずに 401 になります。

### パスワードの強さは API でも確かめるべきですか？

この API では形（文字列かどうか）だけを見て、強さの判定は Cognito のパスワードポリシーに任せています。同じ規則を 2 か所に書くと、片方だけ変えてずれる原因になるからです。

:::
