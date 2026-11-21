// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶクライアントを用意する。

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
const configResponse = await fetch('/config.json', { cache: 'no-store' });
if (!configResponse.ok) {
  document.body.insertAdjacentHTML('afterbegin', '<p class="error">config.json がありません。<code>bash scripts/setup.sh</code> を流してから、読み込み直してください</p>');
  throw new Error('config.json がありません');
}
export const config = await configResponse.json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;
