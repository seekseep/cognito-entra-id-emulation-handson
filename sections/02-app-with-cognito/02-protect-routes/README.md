# トークンを確かめて API を守る

アクセストークンを確かめる Guard と、グループで認可する Guard を足すレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

## 起動方法

```bash
npm install
npm run floci:up && npm run setup
npm run start:dev    # http://localhost:3000
```

## エンドポイント

| メソッド | パス | 必要なもの |
|---|---|---|
| POST | `/auth/signup` `/auth/confirm` `/auth/login` `/auth/refresh` | なし |
| GET | `/me` | アクセストークン |
| GET | `/admin/dashboard` | アクセストークン（admin グループ） |

`npm run make-admin <username>` でユーザーを admin グループに入れられます。
