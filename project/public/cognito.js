// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶクライアントを用意する。
// @since 03-02
// AWS SDK for JavaScript v3 の Cognito の部分を、CDN（esm.sh）から読み込む。ある日から変わらないよう、版を固定する
import { CognitoIdentityProviderClient } from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';
export * from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';
// @end

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
export const config = await (await fetch('/config.json', { cache: 'no-store' })).json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;
// @since 03-02

// Cognito の API を呼ぶクライアント。送り先を config.json の issuer のオリジン（Floci）に向ける。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
export const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1', endpoint: cognitoEndpoint });

export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// Cognito の応答（成功なら結果、失敗ならエラー）を、画面の #output に出す
export function show(action, result) {
  if (result instanceof Error) {
    // 失敗は NotAuthorizedException・UsernameExistsException などの例外になる
    document.querySelector('#output').textContent = `${action} → 失敗\n${result.name}: ${result.message}`;
    return;
  }
  const { $metadata, ...body } = result;
  document.querySelector('#output').textContent = `${action} → 成功\n${JSON.stringify(body, null, 2)}`;
}
// @end
