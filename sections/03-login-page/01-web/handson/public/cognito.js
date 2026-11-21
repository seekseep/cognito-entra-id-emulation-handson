// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶ。

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
export const config = await (await fetch('/config.json', { cache: 'no-store' })).json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;
