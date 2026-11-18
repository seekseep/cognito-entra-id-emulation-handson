---
docs: true
title: 進め方
sidebar:
  label: 進め方
  order: 0
---

# 進め方

教材は「セクション」と「レクチャー」の 2 段に分かれています。手元では **`handson/` という 1 つのフォルダ** に、レクチャーごとにファイルを足していきます。

最初に、お使いの OS を選んでください。選んだ OS はこのブラウザに保存され、OS で手順が分かれる所では、どのページでも選んだ OS の手順だけが表示されます（画面上部の選択欄で、いつでも変えられます）。

::platform-choice

## 1 つのフォルダを育てる

ダウンロードするのは、[Floci を起動する](./00-setup/02-floci/LECTURE.md) で配る `handson/` の 1 回だけです。最初は 4 つのファイルしかありません。そこから次のように育てていきます。

```text
00 準備           compose.yaml・package.json・env.sh（Floci を起動するだけ）
01 Cognito 単体   scripts/ に aws CLI のスクリプトが増える
02 NestJS API     src/・test/・public/ が増え、API のプロジェクトになる
03 Keycloak       compose.yaml に Keycloak、画面に「Hosted UI でログイン」が増える
04 Entra ID       compose.yaml に entra-local、Entra を登録するスクリプトが増える
```

どのレクチャーで、どのファイルを足し・変えるかの一覧です。ファイルがいつ増えるかを見ると、そのファイルが何のためにあるのかが分かります。

::timeline

## 1 つのレクチャーの進め方

1. 最初の「このレクチャーで足すファイル」の表で、何が増えるかを見る
2. 本文に沿って、まずコマンドを手で打って確かめる
3. 確かめたことをファイルにする。本文には要点だけを載せ、ファイルの全文は折りたたみに入れてあります。開いて、写すかコピーして作ってください
4. 最後に、そのレクチャーを終えた `handson/` をエディタで見比べる。足した・変えたファイルには「新規」「変更」の印、変えた行には色が付いています

手元のファイルが壊れたときや、途中のレクチャーから始めるときは、各レクチャーの最後のエディタの「コードをダウンロード」で、そのレクチャーを終えた `handson/` を取れます。

## コンテナと setup

| コマンド | すること |
|---|---|
| `npm run up` | `compose.yaml` にあるコンテナを全部起動する（Floci、03 からは Keycloak、04 からは entra-local も） |
| `npm run down` | 止める |
| `npm run reset` | 止めて起動し直す。Floci と Keycloak のデータは消える |
| `npm run setup` | `scripts/setup.sh` を流し、ここまでのレクチャーで Floci に作ったもの（User Pool・ユーザー・グループ・IdP の登録）を作り直す |

Floci と Keycloak のデータはメモリにあり、コンテナを止めると消えます。そのため 01-01 で `scripts/setup.sh` を作り、レクチャーを終えるたびに 1 行ずつ足していきます。パソコンを再起動したあとなどは、`npm run up` → `npm run setup` で、前のレクチャーを終えた状態に戻せます。`setup` をやり直したら、API（`npm run start:dev`）も起動し直してください（`.env` は起動したときにしか読まれません）。

entra-local（04）のデータだけはボリュームに残り、`npm run reset` でも消えません（消すときは `podman compose down -v`）。

## 使うポート

| ポート | 中身 | 使うセクション |
|---|---|---|
| 4566 | Floci（Cognito） | すべて |
| 3000 | NestJS の API と画面 | 02・03・04 |
| 8080 | Keycloak | 03 |
| 8443 | entra-local | 04 |

:::warning[ほかのプログラムが同じポートを使っていないか]
LocalStack・別の Floci・Docker Desktop のコンテナなどが同じポートを使っていると、エラーにならないまま、アクセスの一部がそちらに流れることがあります（`localhost` が IPv4 と IPv6 の両方に解決されるため）。始める前に、次のコマンドで確かめてください。
:::

:::::platform
::::macos
```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E ':(4566|3000|8080|8443) '
```
::::
::::windows-linux
```bash
ss -ltnp | grep -E ':(4566|3000|8080|8443) '
```
::::
:::::

## 練習用のアカウント

どれも練習用の値です。本物のパスワードに使わないでください。

| どこ | ユーザー | パスワード | 作られる所 |
|---|---|---|---|
| Cognito | `alice`（admin グループ）/ `bob` | `Passw0rd!` | 01-02・01-03（`npm run setup` で作り直せる） |
| Cognito | `carol` | `Passw0rd!` | 02-01 で手でサインアップ（setup では作られない） |
| Keycloak | `kate` / `ken` | `Passw0rd!` | 03-02（realm のファイル） |
| Keycloak の管理コンソール | `admin` | `admin` | 03-02 |
| entra-local | `taro@entralocal.dev` | `Passw0rd!` | 04-01（`npm run entra:create-user`） |
| entra-local のシード | `alice@entralocal.dev` / `bob@entralocal.dev` | `Password1!` | entra-local に最初から入っている |
