# 画面から使う・コンテナで動かす

最小の画面を付け、API もコンテナで動かすレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run floci:up && npm run setup
npm run start:dev          # ホストで動かす → http://localhost:3000
# または
npm run api:up             # API もコンテナで動かす（start:dev は止めておく）
npm run api:down
```

| ファイル | 中身 |
|---|---|
| `public/` | 画面（`index.html`・`main.js`） |
| `Containerfile` | API のイメージ |
| `compose.yaml` | Floci と、`api` プロファイルの API |
