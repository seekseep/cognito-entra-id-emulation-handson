# Floci を起動する

Cognito のエミュレータ Floci を Podman で起動し、aws CLI をそこに向けるレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm run floci:up      # 起動（ヘルスチェックが通るまで待つ）
source ./env.sh       # aws CLI を Floci に向ける
npm run floci:reset   # 全部消して作り直す
npm run floci:down    # 止める
```

## ファイル

| ファイル | 中身 |
|---|---|
| `compose.yaml` | Floci（`127.0.0.1:4566`） |
| `env.sh` | `AWS_ENDPOINT_URL` とダミーのキー |
