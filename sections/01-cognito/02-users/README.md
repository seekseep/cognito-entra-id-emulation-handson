# ユーザーを作る

管理者によるユーザー作成（`NEW_PASSWORD_REQUIRED`）と、サインアップ＋確認コードを体験するレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

| npm scripts | 中身 |
|---|---|
| `floci:up` / `floci:down` / `floci:reset` | Floci の起動・停止・作り直し |
| `setup` | User Pool と App Client を作る（`.cognito.env`） |
| `users` | alice（管理者が作成）と bob（サインアップ）を作る |
| `read-code <email>` | Floci の SES から確認コードを読む |
