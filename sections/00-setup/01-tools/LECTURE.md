---
title: 道具をそろえる
docs: true
---

# 道具をそろえる

![道具をそろえる](./images/00-thumbnail.svg)

このハンズオンでは、Cognito・Keycloak・Entra ID をすべて自分のパソコンの中のコンテナで動かします。AWS のアカウントも Entra のテナントも要りません。使う道具は Podman・aws CLI・Node.js の 3 つです。

## Podman

コンテナを動かす道具です。Docker と同じイメージ・同じ compose ファイルがそのまま使えます。

```bash
# macOS（Homebrew）
brew install podman
```

macOS と Windows では、コンテナは Linux の仮想マシンの中で動きます。最初に一度だけ仮想マシンを作り、使うときに起動します。

```bash
podman machine init    # 初回だけ
podman machine start   # パソコンを再起動したら、その都度
podman info --format '{{.Host.Arch}} {{.Version.Version}}'   # 動いていれば arm64 6.x.x などと出る
```

### `podman compose` について

このハンズオンでは、各レクチャーの `compose.yaml` を `podman compose` で起動します。`podman compose` は自分では compose ファイルを解釈せず、インストールされている **docker-compose** か **podman-compose** に処理を渡します。

| 渡す先 | 特徴 |
|---|---|
| docker-compose | Docker 公式の実装。`--wait` や `profiles` など、このハンズオンで使う機能が全部そろう |
| podman-compose | Python で書かれた Podman 向けの実装。機能が少し足りないことがある |

どちらが使われているかは `podman compose version` で分かります。動作は docker-compose（v2 以降）で確かめています。入っていなければ `brew install docker-compose` で入ります（Docker Desktop は要りません）。

:::warning[Docker Desktop と同時に使うとき]
Docker Desktop で動かしているコンテナが同じポート（4566・8080・8443・3000）を使っていると、`localhost` へのアクセスの一部がそちらに流れます。macOS では `localhost` が IPv6（`::1`）にも IPv4（`127.0.0.1`）にも解決されるため、エラーにならず「ときどき別のサーバーにつながる」という分かりにくい壊れ方をします。始める前に `lsof -nP -iTCP:4566 -sTCP:LISTEN` で、Podman（`gvproxy`）以外が待ち受けていないか確かめてください。
:::

## aws CLI

Cognito を操作する公式のコマンドです。バージョン 2 を使います。

```bash
brew install awscli
aws --version   # aws-cli/2.x.x
```

## Node.js

NestJS の API と、トークンを確かめる小さなスクリプトで使います。**24 以上**を入れてください（`fetch` や `--env-file` を前提にしています）。

```bash
node --version   # v24.x.x 以上
```

## エディタとブラウザ

エディタは何でも構いません。ブラウザの開発者ツール（`F12`）の **Network** タブで、ログインのリダイレクトやトークンのやり取りを追いかけます。

:::faq

### Docker Desktop ではだめですか？

だめではありません。`podman compose` を `docker compose` に、`podman` を `docker` に読み替えれば動きます。ただし本文の中のコンテナ名やネットワークの説明は Podman で確かめたものです。

### `podman machine start` で止まってしまいます

仮想マシンのイメージを取得している最中のことがあります。初回は数分かかります。それでも進まないときは `podman machine stop` → `podman machine start` を試してください。

:::
