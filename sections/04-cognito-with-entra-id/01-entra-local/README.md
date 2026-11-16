# entra-local を用意する

Entra ID のエミュレータ entra-local を起動し、Cognito から使うアプリとユーザーを用意するレクチャーです。内容は [LECTURE.md](./LECTURE.md) を見てください。

```bash
npm run up                              # Floci（4566）と entra-local（8443）
npm run endpoints                       # discovery の主な値
npm run register-app                    # アプリを登録（.entra.env に ID とシークレット）
npm run create-user taro '山田 太郎'      # ユーザーを作る（Passw0rd!）
npm run preview-token taro@entralocal.dev
```

シードのユーザー（`alice@entralocal.dev` / `bob@entralocal.dev`、パスワード `Password1!`）も使えます。
