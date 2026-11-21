---
title: User Pool を作る
docs: true
---

# User Pool を作る

![User Pool を作る](./images/00-thumbnail.svg)

Cognito でユーザーを管理する入れ物が **User Pool** です。aws CLI で User Pool を作ります。このレクチャーで作るファイルはありません。

## 準備

`handson/` で作業します。Floci を止めていたときは、起動してから `env.sh` を読み込みます。

```bash
podman compose up -d
source ./env.sh
```

## User Pool を作る

パスワードポリシーを決めて User Pool を作ります。

```bash
aws cognito-idp create-user-pool \
  --pool-name practice \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false}' \
  --auto-verified-attributes email \
  --query UserPool.Id --output text
# ap-northeast-1_bba540037
```

| オプション | 設定する値 | 意味 |
|---|---|---|
| `--pool-name` | `practice` | User Pool の名前。見分けるためのもので、何でもよい |
| `--policies` | `PasswordPolicy={MinimumLength=8,...}` | パスワードのルール。8 文字以上・英大文字・英小文字・数字を必須にし、記号は求めない |
| `--auto-verified-attributes` | `email` | サインアップしたら、メールに確認コードを送って確かめる。03-03 で使う |
| `--query` | `UserPool.Id` | 応答のうち、User Pool の ID だけを取り出す |
| `--output` | `text` | 取り出した値を、引用符なしの文字だけで出す |

返ってきた ID をシェル変数に入れておきます。`{ }` の所は、直前のコマンドで出た値に書き換えてから実行します（`{ }` ごと消します）。

```bash "{直前の結果で出た User Pool の ID}"
export POOL_ID={直前の結果で出た User Pool の ID}
# 例: export POOL_ID=ap-northeast-1_bba540037
```

## 作ったものを確かめる

```bash
aws cognito-idp describe-user-pool --user-pool-id "$POOL_ID" \
  --query 'UserPool.{Name:Name,Policy:Policies.PasswordPolicy,AutoVerified:AutoVerifiedAttributes}'
```

パスワードポリシーと `AutoVerified: ["email"]` が出れば完成です。Floci を止めると User Pool は消えますが、次のレクチャーで、作り直すスクリプトを用意します。
