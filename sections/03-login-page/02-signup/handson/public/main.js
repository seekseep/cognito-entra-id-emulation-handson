// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
const config = await (await fetch('/config.json', { cache: 'no-store' })).json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
const cognitoEndpoint = new URL(config.issuer).origin;
document.querySelector('#endpoint').textContent = cognitoEndpoint;

// ---- Cognito の API を直接呼ぶ ----

const output = document.querySelector('#output');

function show(label, status, body) {
  output.textContent = `${label} → ${status}\n${JSON.stringify(body, null, 2)}`;
}

function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// Cognito の API を 1 つ呼ぶ。流れを目で追うため、AWS SDK も Amplify も使わずに書く。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
async function cognito(action, params) {
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

document.querySelector('#signup').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, email, password } = formValues(event.target);
  await cognito('SignUp', { Username: username, Password: password, UserAttributes: [{ Name: 'email', Value: email }] });
});

document.querySelector('#confirm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, code } = formValues(event.target);
  await cognito('ConfirmSignUp', { Username: username, ConfirmationCode: code });
});
