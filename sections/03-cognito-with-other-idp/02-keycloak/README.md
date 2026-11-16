# Keycloak を用意する

外部 IdP として Keycloak を起動し、Cognito から使うクライアントを用意するレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

```bash
npm run up          # Floci（4566）と Keycloak（8080）
npm run endpoints   # discovery の主な値
npm run down
```

| 種類 | 値 |
|---|---|
| 管理コンソール | <http://localhost:8080/admin/>（admin / admin） |
| realm | `practice`（`keycloak/realm-practice.json`） |
| ユーザー | `kate` / `ken`（`Passw0rd!`） |
| クライアント | `cognito`（シークレット `cognito-local-secret`） |
