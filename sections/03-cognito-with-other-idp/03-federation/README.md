# Cognito 経由で Keycloak にログインする

Keycloak を Cognito（Floci）の外部 IdP として登録し、Hosted UI 経由でログインするレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run up                  # Floci と Keycloak
npm run setup               # User Pool・クライアント・alice
npm run register-keycloak   # Keycloak を外部 IdP として登録
npm run start:dev           # http://localhost:3000（kate / Passw0rd!）
```

| npm scripts | 中身 |
|---|---|
| `users` | User Pool のユーザー一覧 |
| `make-admin <username>` | admin グループに入れる |
