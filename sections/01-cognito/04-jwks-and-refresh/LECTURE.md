---
title: 署名を確かめる・トークンを更新する
docs: true
---

# 署名を確かめる・トークンを更新する

![署名を確かめる・トークンを更新する](./images/00-thumbnail.svg)

トークンの中身は誰でも書き換えられます。API が受け取ったトークンを信じてよいかは、**署名** で判断します。Cognito がどの鍵で署名したかは JWKS（公開鍵の一覧）で公開されています。この鍵でトークンを確かめ、書き換えたトークンが弾かれることを見ます。最後にリフレッシュトークンでトークンを更新します。

このレクチャーで足すファイルは次のとおりです。署名を確かめるのも、ほかのスクリプトと同じくシェルスクリプトです。鍵の計算は openssl に任せます。

::changes

## 準備

`handson/` で作業します。前のレクチャーから続けているなら、`source` の行だけで構いません。Floci を止めていたときは、起動してから `npm run setup` で前のレクチャーを終えた状態を作り直します。

```bash
npm run up
npm run setup              # 前のレクチャーまでに作ったものを作り直す
source ./env.sh && source ./.cognito.env
```

トークンを 1 組もらっておきます。

```bash
npm run login alice 'Passw0rd!'
```

## discovery と JWKS

トークンの `iss` の後ろに `/.well-known/openid-configuration` を付けると、その発行者の情報（discovery）が読めます。

```bash
curl -s "$AWS_ENDPOINT_URL/$POOL_ID/.well-known/openid-configuration"
```

```json nofile
{
  "issuer": "http://localhost:4566/ap-northeast-1_57965a023",
  "jwks_uri": "http://localhost:4566/ap-northeast-1_57965a023/.well-known/jwks.json",
  "authorization_endpoint": "http://localhost:4566/cognito-idp/oauth2/authorize",
  "token_endpoint": "http://localhost:4566/cognito-idp/oauth2/token"
}
```

`jwks_uri` を開くと公開鍵が並んでいます。トークンのヘッダーの `kid` と同じ `kid` の鍵が、そのトークンの署名を確かめる鍵です。

```bash
curl -s "$AWS_ENDPOINT_URL/$POOL_ID/.well-known/jwks.json"
```

## 署名を確かめる

**`scripts/verify-jwt.sh`** を作ります。次の 3 つを確かめます。

1. JWKS の鍵で署名が正しいか
2. `iss` が自分の User Pool か
3. `exp` を過ぎていないか

要点は、**`iss` を自分の User Pool から組み立て、そこから discovery → `jwks_uri` の順に鍵の在りかを知る** ことです。トークンの中に書かれた `iss` を信じて鍵を取りに行くことはしません。

```bash
ISSUER="$AWS_ENDPOINT_URL/$POOL_ID"
JWKS_URI=$(curl -fsS "$ISSUER/.well-known/openid-configuration" | jq -r .jwks_uri)
KID=$(b64url_decode "$HEADER" | jq -r .kid)
JWK=$(curl -fsS "$JWKS_URI" | jq -c --arg kid "$KID" '.keys[] | select(.kid == $kid)')
```

鍵が決まったら、署名を確かめます。

- JWKS の鍵は、RSA の 2 つの数（`n` と `e`）を base64url で書いたものです。openssl はこの形を直接は読めないので、`asn1parse -genconf` で公開鍵の形（PEM）に組み立てます
- 署名は「`ヘッダー.ペイロード`」という文字列の SHA-256 に対するものです（ヘッダーの `alg` が `RS256`）。`openssl dgst -sha256 -verify` で、署名と鍵が合うかを見ます
- その前に、トークンが base64url の文字だけでできた 3 つの部分か、署名のバイト数が鍵（`n`）と同じ長さかを確かめます。openssl は署名の後ろに余分なバイトが付いていても通してしまうので、この 2 つを省くと、末尾に文字を足しただけのトークンも OK になります
- 署名が合ったあとで、ペイロードの `iss` と `exp` を確かめます。署名を確かめる前の中身は信じません

```bash
openssl dgst -sha256 -verify "$WORK/key.pem" -signature "$WORK/signature" "$WORK/signed"
```

::file{path="scripts/verify-jwt.sh"}

`package.json` に `verify` と、あとで使う `refresh` を足します。

::file{path="package.json"}

```bash
npm run verify "$(jq -r .AccessToken .tokens.json)"
# OK: 署名と iss と exp を確かめました
```

### 書き換えたトークンを送る

ペイロードの `cognito:groups` に `root` を足したトークンを作って、同じように確かめます。

```bash
TAMPERED=$(jq -r '
  .AccessToken | split(".")
  | .[1] |= (gsub("-"; "+") | gsub("_"; "/") | @base64d | fromjson
             | .["cognito:groups"] += ["root"]
             | tojson | @base64 | gsub("\\+"; "-") | gsub("/"; "_") | gsub("="; ""))
  | join(".")' .tokens.json)
npm run -s decode "$TAMPERED"     # cognito:groups が ["admin", "root"] になっている
npm run verify "$TAMPERED"
# NG: 署名が合いません（中身が書き換えられています）
```

真ん中（ペイロード）を開き、`cognito:groups` に `root` を足して、また base64url に戻しています。ヘッダーと署名はそのままです。

中身を 1 文字でも変えると署名が合わなくなります。API が「トークンの中身を信じてよい」のは、この確認を通したときだけです。

### 別の User Pool のトークンを送る

```bash
OTHER=$(aws cognito-idp create-user-pool --pool-name other --query UserPool.Id --output text)
POOL_ID=$OTHER npm run verify "$(jq -r .AccessToken .tokens.json)"
# NG: JWKS に kid が ap-northeast-1_xxxxxxxxx の鍵がありません
```

Floci は User Pool ごとに別の鍵を使います（本物も同じです）。別の User Pool の鍵では確かめられません。

## トークンを更新する

**`scripts/refresh.sh`** は、`.tokens.json` のリフレッシュトークンを jq で取り出し、`REFRESH_TOKEN_AUTH` で送ります。`package.json` の `refresh` は、上で `verify` と一緒に足してあります。

::file{path="scripts/refresh.sh"}

```bash
npm run refresh
```

```json nofile
{ "ExpiresIn": 3600, "HasIdToken": true, "HasRefreshToken": false }
```

新しい ID トークンとアクセストークンが返ります。**リフレッシュトークンは返りません**。手元のリフレッシュトークンを、期限まで使い続けます。

## サインアウトしても、トークンの署名は正しいまま

```bash
AT=$(jq -r .AccessToken .tokens.json)
aws cognito-idp global-sign-out --access-token "$AT"
aws cognito-idp get-user --access-token "$AT"   # NotAuthorizedException: Access Token has been revoked
npm run verify "$AT"                             # OK: 署名と iss と exp を確かめました
```

Cognito に問い合わせれば「取り消し済み」と分かりますが、JWKS で署名を確かめるだけの API には分かりません。JWT は API が Cognito に問い合わせずに済むことと引き換えに、期限までは使えてしまいます。アクセストークンの有効期限を短めにするのはこのためです。

## 本物の Cognito との違い

このセクションで見つけた違いをまとめます。

| 項目 | Floci 2.4.0 | 本物の Cognito |
|---|---|---|
| `iss` のホスト | `http://localhost:4566` | `https://cognito-idp.<region>.amazonaws.com` |
| 確認メール | 送らずに SES にためる（`/_aws/ses`） | 実際に送る（送信数に上限がある） |
| 存在しないユーザーでログイン | `PreventUserExistenceErrors` を無視し、いつも `UserNotFoundException` | `ENABLED` なら `NotAuthorizedException`（存在を漏らさない）。既定はコンソールで作ると `ENABLED`、API・CLI で値を渡さないと `LEGACY`（`UserNotFoundException`） |
| Lambda トリガー | Floci は Lambda をコンテナで動かすので、コンテナエンジンへの接続が要る（このハンズオンでは試していない） | 動く |

後のセクションで見つけた違いも、ここにまとめておきます。

| 項目 | Floci 2.4.0 | 本物の Cognito | 見つけた所 |
|---|---|---|---|
| 確認コードの照合 | `AutoVerifiedAttributes` に `email` が無いと、どんなコードでも確認が通る | 違うコードは `CodeMismatchException` | [01-02](../02-users/LECTURE.md) |
| どこから呼んでも `iss` | いつも `http://localhost:4566/<プール ID>`。コンテナの中から `floci:4566` で呼んでも変わらない | いつも `https://cognito-idp.<region>.amazonaws.com/<プール ID>` | このレクチャー |
| ブラウザから Cognito の API を呼ぶ | `FLOCI_SECURITY_EXTRA_CORS_ALLOWED_ORIGINS` で CORS を許す必要がある | 最初から CORS に対応している | [02-01](../../02-login-page/01-signup-and-login/LECTURE.md) |
| 存在しないユーザーでのログイン | `PreventUserExistenceErrors: ENABLED` でも `UserNotFoundException` | `ENABLED` ならパスワード違いと同じ `NotAuthorizedException` | [02-01](../../02-login-page/01-signup-and-login/LECTURE.md) |
| 外部 IdP から入ったユーザーの名前 | `EntraID_<別の UUID>`。`identities` の `userId` とは違う値 | `EntraID_<IdP の sub>`（`identities` の `userId` と同じ） | [03-02](../../03-cognito-with-entra-id/02-federation/LECTURE.md) |
| 外部 IdP（OIDC）の登録 | discovery を読みに行かないので、エンドポイントを全部明示する | `oidc_issuer` だけでよく、discovery が届かないと登録を拒否する | [03-02](../../03-cognito-with-entra-id/02-federation/LECTURE.md) |

それ以外の、このセクションで試したこと（パスワードポリシー、確認コードの照合、`SECRET_HASH`、許可していない認証フロー、グループ、署名、更新、サインアウト）は本物と同じ振る舞いでした。

## setup.sh はそのまま

このレクチャーでは、Floci に残るもの（User Pool・ユーザー・グループ）を新しく作っていません。作ったのは手元の道具だけなので、`setup.sh` に足す行はありません。

## このレクチャーを終えた handson/

::codeview

:::faq

### 本番の API でも、このように自分で確かめるのですか？

いいえ。このスクリプトは、署名の確かめで何が起きているかを目で追うためのものです。本番の API では、[aws-jwt-verify](https://github.com/awslabs/aws-jwt-verify)（AWS の公式）や [jose](https://github.com/panva/jose) などのライブラリを使ってください。

- 取った鍵を覚えておき、知らない `kid` のトークンが来たときだけ JWKS を取り直します。このスクリプトのように毎回取りに行くと遅くなります
- `alg`・`iss`・`exp` のほか、`token_use`・`client_id`（`aud`）や、発行前の時刻（`nbf`）なども漏れなく確かめます

### 鍵の取得先は `iss` から決めてよいのですか？

決め打ちしてよいのは、`iss` を自分の User Pool と照らし合わせたあとです。トークンの中の `iss` をそのまま信じて鍵を取りに行くと、攻撃者が自分の鍵の在りかを書いたトークンを送ってくるかもしれません。このスクリプトは、自分の User Pool の `iss` を先に組み立て、そこから鍵を取りに行っています。

:::
