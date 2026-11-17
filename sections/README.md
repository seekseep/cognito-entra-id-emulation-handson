---
docs: true
title: 進め方
sidebar:
  label: 進め方
  order: 0
---

# 進め方

教材は「セクション」と「レクチャー」の 2 段に分かれています。レクチャーのフォルダが、そのまま 1 つの動くサンプルです。

```text
sections/
  00-setup/                     準備
  01-cognito/                   Cognito 単体（aws CLI）
  02-app-with-cognito/          NestJS API から使う
  03-cognito-with-other-idp/    Hosted UI と Keycloak
  04-cognito-with-entra-id/     Entra ID（entra-local）
```

## 1 つのレクチャーの進め方

1. レクチャーのフォルダに移動する（ページの「サンプルコードをダウンロード」からでも、このリポジトリのフォルダでも構いません）
2. `npm run floci:up`（または `npm run up`）でコンテナを起動する
3. `npm run setup` で「前のレクチャーを終えた状態」を作る
4. 本文に沿って手を動かす

Floci と Keycloak のデータはメモリにあり、コンテナを作り直すと消えます。entra-local（04）だけはボリュームに残り、`npm run down` では消えません（消すときは `npm run reset`）。レクチャーを移るときは、前のレクチャーのコンテナを止めてから（`npm run floci:down` / `npm run down`）次を起動してください。同じポートを使うので、2 つ同時には動きません。

## 使うポート

| ポート | 中身 | 使うセクション |
|---|---|---|
| 4566 | Floci（Cognito） | すべて |
| 3000 | NestJS の API と画面 | 02・03・04 |
| 8080 | Keycloak | 03 |
| 8443 | entra-local | 04 |

:::warning[ほかのプログラムが同じポートを使っていないか]
LocalStack・別の Floci・Docker Desktop のコンテナなどが同じポートを使っていると、エラーにならないまま、アクセスの一部がそちらに流れることがあります（`localhost` が IPv4 と IPv6 の両方に解決されるため）。始める前に確かめてください。

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(4566|3000|8080|8443) '   # macOS
ss -ltnp | grep -E ':(4566|3000|8080|8443) '                      # Linux / WSL2
```
:::

## 練習用のアカウント

どれも練習用の値です。本物のパスワードに使わないでください。

| どこ | ユーザー | パスワード |
|---|---|---|
| Cognito（01-03・01-04 の `npm run setup` が作る） | `alice` / `bob` | `Passw0rd!` |
| Cognito（02-02 の `npm run setup` が作る） | `carol` | `Passw0rd!` |
| Cognito（03・04-02 の `npm run setup` が作る） | `alice` | `Passw0rd!` |
| Keycloak | `kate` / `ken` | `Passw0rd!` |
| Keycloak の管理コンソール | `admin` | `admin` |
| entra-local（`npm run create-user`） | `taro@entralocal.dev` | `Passw0rd!` |
| entra-local のシード | `alice@entralocal.dev` / `bob@entralocal.dev` | `Password1!` |

01-01・01-02 と、02-01・02-03・02-04 の `npm run setup` はユーザーを作りません。本文の手順で自分でサインアップします。Floci のユーザーはレクチャーごとに別の User Pool にいるので、前のレクチャーで作ったユーザーは次のレクチャーにはいません。
