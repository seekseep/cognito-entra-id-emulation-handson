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

// ---- パスワードでログインする ----

// 練習なので sessionStorage に置く（タブを閉じると消える）。XSS があると読まれてしまう場所なので、本番では置き場所を検討する
let tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');

function saveTokens(next) {
  tokens = next;
  if (tokens) sessionStorage.setItem('tokens', JSON.stringify(tokens));
  else sessionStorage.removeItem('tokens');
  render();
}

// JWT の真ん中（ペイロード）を読む。署名は確かめない（表示するだけなので）
function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

function render() {
  const claims = tokens?.idToken ? decodeJwt(tokens.idToken) : null;
  document.querySelector('#status').textContent = claims ? `${claims['cognito:username']} としてログイン中` : 'ログインしていません';
  document.querySelector('#id-token').textContent = claims ? JSON.stringify(claims, null, 2) : 'ログインすると表示します';
}

document.querySelector('#login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, password } = formValues(event.target);
  const { ok, json } = await cognito('InitiateAuth', {
    AuthFlow: 'USER_PASSWORD_AUTH',
    AuthParameters: { USERNAME: username, PASSWORD: password },
  });
  // 管理者が作ったユーザーの初回ログインなどでは、トークンの代わりにチャレンジ（ChallengeName）が返る
  const result = json.AuthenticationResult;
  if (ok && result) saveTokens({ idToken: result.IdToken, accessToken: result.AccessToken, refreshToken: result.RefreshToken });
});

document.querySelector('#logout').addEventListener('click', async () => {
  // 手元から消す前に、リフレッシュトークンを Cognito で取り消す（盗まれていても使えなくする）
  if (tokens?.refreshToken) await cognito('RevokeToken', { Token: tokens.refreshToken });
  saveTokens(null);
});
render();
