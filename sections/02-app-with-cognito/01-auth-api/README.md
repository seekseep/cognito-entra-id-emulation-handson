# 認証 API を作る

NestJS で Cognito（Floci）に向けたサインアップ・ログイン API を作るレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run floci:up     # Floci を起動
npm run setup        # User Pool などを作り .env を書く
npm run start:dev    # http://localhost:3000
```

## エンドポイント

| メソッド | パス | 中身 |
|---|---|---|
| POST | `/auth/signup` | `{username, email, password}` でサインアップ |
| POST | `/auth/confirm` | `{username, code}` で確認 |
| POST | `/auth/login` | `{username, password}` でログイン |
| POST | `/auth/refresh` | `{refreshToken}` でトークンを更新 |
