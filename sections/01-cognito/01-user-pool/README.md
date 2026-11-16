# User Pool と App Client を作る

aws CLI で User Pool と App Client を作るレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 使い方

```bash
npm run floci:up      # Floci を起動
npm run setup         # User Pool と App Client を作り、ID を .cognito.env に書く
source ./env.sh && source ./.cognito.env
```

| npm scripts | 中身 |
|---|---|
| `floci:up` / `floci:down` / `floci:reset` | Floci の起動・停止・作り直し |
| `setup` | `scripts/create-user-pool.sh` |
