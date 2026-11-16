# Hosted UI でログインする

Cognito の Hosted UI（Floci のログイン画面）で、認可コードフロー + PKCE を通すレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run floci:up && npm run setup
npm run start:dev      # http://localhost:3000 （alice / Passw0rd!）
```

## エンドポイント

| メソッド | パス | 中身 |
|---|---|---|
| GET | `/config` | 画面に渡す設定（`issuer`・`clientId`・`scope`・`identityProviders`） |
| GET | `/me` | アクセストークンが必要 |
| GET | `/admin/dashboard` | admin グループのアクセストークンが必要 |
