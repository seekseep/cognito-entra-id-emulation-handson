# e2e テストを Floci に向けて流す

Vitest + supertest で、認証 API の e2e テストを Floci に向けて流すレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

```bash
npm install
npm run floci:up
npm run test:e2e
```

| ファイル | 中身 |
|---|---|
| `test/floci.ts` | User Pool を作る・グループに入れる・確認コードを読む |
| `test/auth.e2e-spec.ts` | テスト本体 |
| `vitest.config.e2e.ts` | e2e 用の Vitest の設定 |
