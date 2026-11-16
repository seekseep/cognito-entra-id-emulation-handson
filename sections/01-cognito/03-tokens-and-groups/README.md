# トークンを読む・グループを使う

ID トークン・アクセストークンの中身を読み、グループがトークンに載ることを確かめるレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

| npm scripts | 中身 |
|---|---|
| `floci:up` / `floci:down` / `floci:reset` | Floci の起動・停止・作り直し |
| `setup` | User Pool・App Client・alice・bob を作る |
| `groups` | admin グループを作って alice を入れる |
| `login <user> <password>` | ログインしてトークンを `.tokens.json` に保存 |
| `decode` | 標準入力の JWT を読む（署名は確かめない） |
