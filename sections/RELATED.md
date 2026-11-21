---
docs: true
title: 関連するハンズオン
sidebar:
  label: 関連するハンズオン
  order: 4
---

# 関連するハンズオン

このハンズオンは、NestJS のハンズオン 3 本とつながっています。それぞれ別のフォルダを最初から作るので、どれから始めても進められます。

| ハンズオン | すること | 使うもの |
|---|---|---|
| Cognito と Entra ID をローカルで練習する（このハンズオン） | Floci の Cognito を aws CLI で設定し、素の HTML の画面からサインアップ・ログインして、Cognito 経由で Entra ID（entra-local）にログインする | Podman・aws CLI・jq |
| [NestJS で作る REST API](https://seekseep.github.io/nestjs-rest-api-handson/) | OpenAPI で API を設計し、メモの作成・取得・一覧・更新・削除を NestJS で実装して、NestJS の形（モジュール・サービス・DTO）に整理する | Node.js・VS Code |
| [NestJS と Cognito で認証と認可](https://seekseep.github.io/nestjs-cognito-auth-handson/) | ノートの API に、Amazon Cognito のトークンでの認証と、作った人だけが削除できる認可を足す | Node.js・Podman・VS Code |
| [NestJS のテスト](https://seekseep.github.io/nestjs-testing-handson/) | ノートの API に、単体テスト・結合テスト・E2E テストを書く | Node.js・VS Code |

## つながり

- **このハンズオン → 認証と認可:** どちらも Cognito に Floci を使い、画面は `fetch` で Cognito を直接呼ぶ素の HTML です。このハンズオンではトークンの中身と JWKS での署名の確かめ方を手で追い（04-02・04-03）、認証と認可では同じ確かめを API（NestJS）の側で行います。
- **認証と認可 → このハンズオン:** Entra ID のユーザーで入れるようにする（フェデレーション）のは、このハンズオンの 05 です。Entra ID 経由でログインしても、アプリが受け取るのは Cognito のトークンなので、API の側は変えずに済みます。
- **REST API・テスト:** Cognito は使いません。認証と認可で使う NestJS の書き方は REST API で、テストの書き方はテストのハンズオンで学べます。
