# Cognito 経由で Entra ID にログインする

entra-local を Cognito（Floci）の外部 IdP として登録し、Entra のユーザーでログインするレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run up
npm run setup
npm run register-app
npm run create-user taro '山田 太郎'
npm run register-entra
npm run start:dev       # http://localhost:3000（taro@entralocal.dev / Passw0rd!）
```

| npm scripts | 中身 |
|---|---|
| `users` | User Pool のユーザー一覧（`custom:entra_oid` 付き） |
| `make-admin <username>` | admin グループに入れる |
