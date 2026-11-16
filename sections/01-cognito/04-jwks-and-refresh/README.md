# 署名を確かめる・トークンを更新する

JWKS でトークンの署名を確かめ、リフレッシュトークンで更新するレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

| npm scripts | 中身 |
|---|---|
| `floci:up` / `floci:down` / `floci:reset` | Floci の起動・停止・作り直し |
| `setup` | User Pool・App Client・alice・bob・admin グループを作る |
| `login <user> <password>` | ログインしてトークンを `.tokens.json` に保存 |
| `decode` | 標準入力の JWT を読む |
| `verify <token>` | JWKS で署名・`iss`・`exp` を確かめる（`npm install` が必要） |
| `refresh` | `.tokens.json` のリフレッシュトークンで更新する |
