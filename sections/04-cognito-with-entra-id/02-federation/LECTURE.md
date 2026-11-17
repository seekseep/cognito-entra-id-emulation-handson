---
title: Cognito 経由で Entra ID にログインする
docs: true
---

# Cognito 経由で Entra ID にログインする

![Cognito 経由で Entra ID にログインする](./images/00-thumbnail.svg)

entra-local を Cognito の外部 IdP（OIDC）として登録し、「EntraID でログイン」で Entra のユーザーをアプリに入れます。やることは Keycloak のときとほぼ同じです。違いは Entra に特有の部分、とくに **ユーザーを何で見分けるか** です。

:::download
[サンプルコードをダウンロード](./project.zip)
:::

## 動かす

```bash
npm install
npm run up                         # Floci と entra-local
npm run setup                      # User Pool（custom:entra_oid 付き）・クライアント・alice
npm run register-app               # entra-local にアプリを登録（.entra.env）
npm run create-user taro '山田 太郎'
npm run register-entra             # entra-local を外部 IdP として登録
npm run start:dev
```

:::notice[2 回目以降に動かすとき]
`npm run down` → `npm run up` のあと、Floci（Cognito）は空に戻りますが、entra-local のアプリ登録と taro はボリュームに残っています。上の手順をそのまま流して構いません。`register-app` は登録済みのアプリを使い続け、`create-user` は既にいるユーザーを表示するだけです。`setup` と `register-entra` で Cognito 側を作り直したら、API を起動し直してください。entra-local も含めてまっさらにしたいときは `npm run reset` を使います。
:::

<http://localhost:3000> の「EntraID でログイン」を押し、entra-local のサインイン画面で `taro@entralocal.dev` / `Passw0rd!` を入れます。戻ってきたら ID トークンを見てください。

```json
{
  "cognito:username": "EntraID_272c8101-ef40-41cb-bd40-ed64f04a6546",
  "custom:entra_oid": "daa6ae20-6153-4193-a9f7-9f8cc48bbf34",
  "name": "山田 太郎",
  "preferred_username": "taro@entralocal.dev",
  "email": "taro@entralocal.dev",
  "iss": "http://localhost:4566/ap-northeast-1_16130330b"
}
```

## 外部 IdP を登録する

[scripts/register-entra.sh](./scripts/register-entra.sh) の中心です。

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id "$POOL_ID" \
  --provider-name EntraID \
  --provider-type OIDC \
  --provider-details "client_id=$ENTRA_CLIENT_ID,client_secret=$ENTRA_CLIENT_SECRET,
      authorize_scopes=openid email profile,
      oidc_issuer=http://localhost:8443/$ENTRA_TENANT_ID/v2.0,attributes_request_method=GET,
      authorize_url=http://localhost:8443/$ENTRA_TENANT_ID/oauth2/v2.0/authorize,
      token_url=http://entra-local:8443/$ENTRA_TENANT_ID/oauth2/v2.0/token,
      attributes_url=http://entra-local:8443/graph/oidc/userinfo,
      jwks_uri=http://entra-local:8443/$ENTRA_TENANT_ID/discovery/v2.0/keys" \
  --attribute-mapping email=email,name=name,preferred_username=preferred_username,custom:entra_oid=oid,username=sub
```

- `oidc_issuer` は **v2.0 の、自分のテナントの issuer** にします。Entra には `common`（どのテナントでも可）というエンドポイントもありますが、Cognito に登録するのは自分のテナントのものです
- ブラウザが通る `authorize_url` だけ `localhost`、Floci がコンテナの中から呼ぶものはサービス名 `entra-local`。考え方は Keycloak と同じです

## `oid` を持ち込む

前のレクチャーで見たとおり、Entra の `sub` はアプリごとに変わります。Cognito のユーザー名 `EntraID_<sub>` も、Entra にとっての「Cognito というアプリ」向けの値です。あとで別のアプリから同じ人を探したくなったとき、`sub` では見つかりません。

そこで、テナントの中で変わらない `oid` をカスタム属性 `custom:entra_oid` に持ち込みます。

1. User Pool を作るときにカスタム属性を定義する（[scripts/setup-cognito.sh](./scripts/setup-cognito.sh)）
   ```bash
   --schema Name=entra_oid,AttributeDataType=String,Mutable=true
   ```
2. 属性のマッピングで、userinfo の `oid` を入れる: `custom:entra_oid=oid`
3. App Client で読み取りを許す: `--read-attributes ... custom:entra_oid`

```bash
npm run users
```

```text
|        Email        |               EntraOid                 |                   Username                     |
|  taro@entralocal.dev|  daa6ae20-6153-4193-a9f7-9f8cc48bbf34  |  EntraID_272c8101-ef40-41cb-bd40-ed64f04a6546  |
|  alice@example.com  |  None                                  |  alice                                         |
```

:::notice[カスタム属性は後から型を変えられない]
Cognito のカスタム属性は、一度作ると名前も型も変えられず、消すこともできません。本番の User Pool では、名前を慎重に決めてから足してください。
:::

## Entra 固有の落とし穴

本物の Entra ID につなぐときに踏みやすいところです。entra-local で再現できるものと、できないものがあります。

- **テナントごとの issuer と `common`** … `https://login.microsoftonline.com/<テナント ID>/v2.0` が issuer です。`common` や `organizations` のエンドポイントで発行されたトークンも、`iss` には個々のテナント ID が入ります。Cognito に登録する `oidc_issuer` は自分のテナントのものにします
- **`email` が来ないことがある** … Entra の `email` は、ユーザーにメールアドレスが設定されていないと入りません。必ずある `preferred_username`（UPN）と混同しないこと。Cognito の属性で `email` を必須にしていると、ログインに失敗する人が出ます
- **グループの overage** … `groups` クレームを有効にしても、所属が多い（ID トークンで 200 を超える）ユーザーでは一覧の代わりに「Graph で引いてください」という印（`_claim_names`）が入ります。entra-local でも `groupOverageLimit` で再現できます
- **シークレットの期限切れ** … Entra のクライアントシークレットには期限があります（既定は 6 か月〜2 年）。切れると Cognito からのトークン交換が失敗し、全員がログインできなくなります。期限を管理しておくこと

:::faq

### entra-local のサインイン画面で「Invalid redirect URI」と出ます

アプリの登録のリダイレクト URI と、Cognito（Floci）が送ってくる `redirect_uri`（`http://localhost:4566/cognito-idp/oauth2/idpresponse`）が 1 文字でも違うと拒否されます。`.entra.env` を消してから `npm run register-app` で登録し直し、`npm run register-entra` で Cognito 側の登録も新しいクライアント ID とシークレットに合わせます。そのあと API を起動し直してください。

### Entra のアプリロールやグループで認可したいときは？

本物の Entra では、アプリロールをユーザーに割り当てると ID トークンの `roles` クレームに入ります。属性のマッピングでカスタム属性に持ち込めば、API で読めます。entra-local もアプリロールの定義はできますが、ユーザーへの割り当てまではこのハンズオンでは試していません。

:::
