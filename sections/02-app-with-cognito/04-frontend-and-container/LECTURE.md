---
title: 画面から使う・コンテナで動かす
docs: true
---

# 画面から使う・コンテナで動かす

![画面から使う・コンテナで動かす](./images/00-thumbnail.svg)

最小の画面を付けて、ブラウザからサインアップ・ログイン・API の呼び出しをします。後半では API もコンテナに入れて動かし、そのときに起きる **`iss` のずれ** を直します。最後に、本番の Cognito に切り替えるときに何を変えればよいかを確かめます。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

## 画面から使う

```bash
npm install
npm run floci:up
npm run setup
npm run start:dev
```

<http://localhost:3000> を開きます。画面は [public/index.html](./public/index.html) と [public/main.js](./public/main.js) だけで、`fetch` で API を呼んでいます。NestJS の `ServeStaticModule` が `public/` を同じオリジンで配るので、CORS の設定は要りません。

1. サインアップする
2. <http://localhost:4566/_aws/ses> で確認コードを読み、確認する
3. ログインして `GET /me` を押す
4. `GET /admin/dashboard` は 403。`npm run make-admin <username>` のあと、ログインし直すと 200

開発者ツールの Network タブで、`/auth/login` の応答にトークンが入っていること、`/me` の要求に `Authorization: Bearer ...` が付いていることを確かめてください。

:::warning[トークンの置き場所]
この画面はトークンを `sessionStorage` に置いています。ページに XSS があると JavaScript から読まれてしまう場所です。練習なのでこうしていますが、本番では httpOnly の Cookie にするなど、置き場所を検討してください。
:::

## API をコンテナで動かす

[Containerfile](./Containerfile) は、ビルド用と実行用の 2 段に分けたイメージです。[compose.yaml](./compose.yaml) の `api` サービスは `profiles: ["api"]` にしてあり、指定したときだけ起動します。

```bash
npm run setup          # Floci を作り直したならやり直す
npm run api:up         # podman compose --profile api up -d --build --wait
```

ホストで動かしている `npm run start:dev` は止めておいてください（同じ 3000 番を使います）。

### コンテナの中から見た Floci

コンテナの中の `localhost` はそのコンテナ自身です。API のコンテナから Floci には、compose のサービス名 `floci` で届きます。

```yaml
environment:
  COGNITO_ENDPOINT: http://floci:4566
```

ところが、これだけでは `/me` が 401 になります。トークンを開くと理由が分かります。

```text
iss: http://localhost:4566/ap-northeast-1_f06ce8963
```

Floci は、どこから呼ばれても `iss` を自分の基準 URL（`http://localhost:4566`）で書きます。API は `COGNITO_ENDPOINT` から `iss` を `http://floci:4566/...` と組み立てるので、食い違います。

`iss` は **発行者の名前** で、鍵を取りに行く **住所** とは別物です。compose で 2 つを分けて渡します。

```yaml
environment:
  COGNITO_ENDPOINT: http://floci:4566
  COGNITO_ISSUER: http://localhost:4566/${COGNITO_USER_POOL_ID}
  COGNITO_JWKS_URL: http://floci:4566/${COGNITO_USER_POOL_ID}/.well-known/jwks.json
```

`${COGNITO_USER_POOL_ID}` は、compose が同じフォルダの `.env` から埋めます。これで `/me` が 200 になります。

## 本番の Cognito に切り替える

コードは変えません。`.env` をこうするだけです。

```bash
AWS_REGION=ap-northeast-1
# COGNITO_ENDPOINT は書かない（SDK が本物の Cognito に向く）
COGNITO_USER_POOL_ID=ap-northeast-1_本物のプール ID
COGNITO_CLIENT_ID=本物のクライアント ID
```

- `iss` は `https://cognito-idp.ap-northeast-1.amazonaws.com/<プール ID>`、JWKS はその後ろの `/.well-known/jwks.json` になり、設定が自動で組み立てます
- `AWS_ACCESS_KEY_ID` などのダミーのキーは消します。この API が呼ぶ `SignUp`・`ConfirmSignUp`・`InitiateAuth` は、IAM の認証情報なしでクライアント ID だけで呼べる API です
- 本物の App Client でも `ALLOW_USER_PASSWORD_AUTH` を許しておく必要があります

:::faq

### `npm run api:up` が終わらない・失敗します

初回はイメージのビルドに数分かかります。失敗したときは `podman compose --profile api logs api` でログを見てください。`.env` が無いと起動直後に「環境変数がありません」で止まります。

### Amplify を使う場合は？

Amplify（`aws-amplify`）の `signIn` は既定で SRP を使い、エンドポイントも本物の Cognito に固定されています。Floci に向けるには `Amplify.configure` で `userPoolEndpoint` を指定し、`signIn` の `authFlowType` を `USER_PASSWORD_AUTH` にします（Floci の SRP も試せますが、このハンズオンでは確かめていません）。

:::
