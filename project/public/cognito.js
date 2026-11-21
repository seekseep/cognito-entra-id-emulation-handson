// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶ。

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
export const config = await (await fetch('/config.json', { cache: 'no-store' })).json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;
// @since 03-02

// Cognito の応答を、画面の #output に出す
export function show(label, status, body) {
  document.querySelector('#output').textContent = `${label} → ${status}\n${JSON.stringify(body, null, 2)}`;
}

export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// Cognito の API を 1 つ呼ぶ。流れを目で追うため、AWS SDK も Amplify も使わずに書く。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
export async function cognito(action, params) {
  const response = await fetch(cognitoEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-amz-json-1.1',
      'x-amz-target': `AWSCognitoIdentityProviderService.${action}`,
    },
    body: JSON.stringify({ ClientId: config.clientId, ...params }),
  });
  const json = await response.json().catch(() => ({}));
  // 失敗すると {"__type":"NotAuthorizedException","message":"..."} の形で返る
  show(action, response.status, json);
  return { ok: response.ok, json };
}
// @end
