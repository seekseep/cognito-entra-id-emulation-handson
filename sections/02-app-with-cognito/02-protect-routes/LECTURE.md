---
title: トークンを確かめて API を守る
docs: true
---

# トークンを確かめて API を守る

![トークンを確かめて API を守る](./images/00-thumbnail.svg)

ログインして受け取ったアクセストークンを、API が確かめるようにします。トークンが無い・正しくないなら **401**、本人だが権限が足りないなら **403** を返します。NestJS では、この判定を **Guard** に書きます。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

## 動かす

```bash
npm install
npm run floci:up
npm run setup
npm run start:dev
```

`npm run setup` は、前のレクチャーを終えた状態として、確認済みの carol（パスワード `Passw0rd!`）まで作ります。別のターミナルで carol としてログインし、アクセストークンを `AT` に入れます。

```bash
AT=$(curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"username":"carol","password":"Passw0rd!"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")
curl -s localhost:3000/me -H "authorization: Bearer $AT"
# {"sub":"...","username":"carol","groups":[]}
curl -s localhost:3000/admin/dashboard -H "authorization: Bearer $AT"
# {"message":"admin グループの利用者だけが使えます","error":"Forbidden","statusCode":403}
```

## CognitoJwtGuard

[src/auth/cognito-jwt.guard.ts](./src/auth/cognito-jwt.guard.ts) は、前のセクションの `verify-jwt.mjs` と同じことを API の中でやります。

```ts
({ payload } = await jwtVerify(token, this.jwks, { issuer: this.config.issuer }));

if (payload.token_use !== 'access') { /* 401 */ }
if (payload.client_id !== this.config.clientId) { /* 401 */ }
```

署名・`iss`・`exp` に加えて、2 つを確かめています。

- `token_use` が `access` … ID トークンを送られても受け付けない。ID トークンは「誰か」を伝えるためのもので、API を呼ぶ許可ではありません
- `client_id` が自分のクライアント … 同じ User Pool の別のアプリ向けに出たトークンを受け付けない。Cognito のアクセストークンには `aud` が無いので、代わりにこれを見ます

確かめた結果は `request.user` に入れ、[@CurrentUser()](./src/auth/current-user.decorator.ts) でハンドラから受け取ります。

```ts
@Get('me')
me(@CurrentUser() user: CognitoUser) {
  return user;
}
```

## グループで認可する

[@Roles()](./src/auth/roles.decorator.ts) で「このハンドラを使えるグループ」を書き、[RolesGuard](./src/auth/roles.guard.ts) がトークンの `cognito:groups` と照らし合わせます。

```ts
@Get('admin/dashboard')
@Roles(['admin'])
dashboard(@CurrentUser() user: CognitoUser) { ... }
```

carol を admin グループに入れて、もう一度試します。

```bash
npm run make-admin carol
curl -s localhost:3000/admin/dashboard -H "authorization: Bearer $AT"   # まだ 403
```

入れたのに 403 のままです。手元のトークンは admin に入る前に発行したもので、`cognito:groups` が空のままだからです。ログインし直して、新しいトークンで呼びます。

```bash
AT=$(curl -s -X POST localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"username":"carol","password":"Passw0rd!"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).accessToken))")
curl -s localhost:3000/admin/dashboard -H "authorization: Bearer $AT"
# {"message":"ようこそ、管理者の carol さん"}
```

グループの変更は、次に発行されたトークンから効きます。

## 401 と 403

| 状況 | ステータス |
|---|---|
| `Authorization` ヘッダーが無い | 401 |
| 署名が合わない・期限切れ・別の User Pool | 401 |
| ID トークンを送った・別のクライアント向けのトークン | 401 |
| 本人だが admin グループではない | 403 |

401 は「あなたが誰か分からない」、403 は「あなたが誰かは分かったが、それはできない」です。

:::faq

### Guard をアプリ全体にかけないのはなぜですか？

`/auth/login` のようにトークンを持たずに呼ぶ API もあるからです。ここでは保護したいコントローラにだけ `@UseGuards(CognitoJwtGuard, RolesGuard)` を付けています。全体にかけて、例外のハンドラだけ外す書き方もあります。

### グループではなく、もっと細かい権限を付けたいときは？

Cognito にはリソースサーバーとカスタムスコープがあり、アクセストークンの `scope` に `orders:read` のような権限を載せられます。グループは「人の役割」、スコープは「このクライアントに許す操作」と考えると使い分けやすいです。

:::
