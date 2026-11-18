import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    // テストは環境変数（process.env）を書き換えてからアプリを組み立てる。並列に流すと設定が混ざる
    fileParallelism: false,
  },
});
