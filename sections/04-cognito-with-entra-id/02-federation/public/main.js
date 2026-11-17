// Authorization Code + PKCE をライブラリなしで書く。流れを目で追うための最小実装
const output = document.querySelector('#output');
const redirectUri = `${location.origin}/`;

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

// どの User Pool に、どのクライアントとして行くかは API（/config）から教えてもらう
const config = await (await fetch('/config')).json();
// 認可・トークンのエンドポイントは discovery が教えてくれる（本物の Cognito でも Floci でも同じ書き方）
const discovery = await (await fetch(`${config.issuer}/.well-known/openid-configuration`)).json();
document.querySelector('#issuer').textContent = discovery.authorization_endpoint;

async function login(identityProvider) {
  // verifier は手元に残し、そのハッシュ（challenge）だけを渡す。
  // 認可コードを横取りされても、verifier を知らなければトークンに換えられない
  const verifier = randomString();
  const challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  const state = randomString();
  sessionStorage.setItem('pkce', JSON.stringify({ verifier, state }));

  const params = {
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: config.scope,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  };
  // identity_provider を付けると、Cognito のログイン画面を飛ばしてその IdP へ直行する
  if (identityProvider) params.identity_provider = identityProvider;

  const url = new URL(discovery.authorization_endpoint);
  url.search = new URLSearchParams(params);
  location.assign(url);
}

async function handleCallback() {
  const params = new URLSearchParams(location.search);
  if (!params.has('code') && !params.has('error')) return;
  // 認可コードを URL に残さない（リロードや共有で漏れないように）
  history.replaceState(null, '', redirectUri);

  if (params.has('error')) {
    output.textContent = `ログインに失敗しました: ${params.get('error')} ${params.get('error_description') ?? ''}`;
    return;
  }
  const saved = JSON.parse(sessionStorage.getItem('pkce') ?? '{}');
  sessionStorage.removeItem('pkce');
  // 自分が出したリクエストへの応答かを state で確かめる（CSRF 対策）
  if (params.get('state') !== saved.state) {
    output.textContent = 'state が一致しません。ログインをやり直してください';
    return;
  }

  const response = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      code: params.get('code'),
      redirect_uri: redirectUri,
      code_verifier: saved.verifier,
    }),
  });
  const tokens = await response.json();
  if (!response.ok) {
    output.textContent = `トークンをもらえませんでした: ${JSON.stringify(tokens)}`;
    return;
  }
  sessionStorage.setItem('tokens', JSON.stringify(tokens));
}

function render() {
  const buttons = document.querySelector('#login-buttons');
  const cognitoButton = document.createElement('button');
  cognitoButton.textContent = 'Cognito のログイン画面へ';
  cognitoButton.addEventListener('click', () => login());
  buttons.append(cognitoButton);
  for (const name of config.identityProviders) {
    const button = document.createElement('button');
    button.textContent = `${name} でログイン`;
    button.addEventListener('click', () => login(name));
    buttons.append(button);
  }

  const tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
  if (!tokens) return;
  const claims = decodeJwt(tokens.id_token);
  document.querySelector('#status').textContent = `${claims['cognito:username']} としてログイン中`;
  document.querySelector('#id-token').textContent = JSON.stringify(claims, null, 2);
}

async function callApi(path) {
  const tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
  const headers = tokens ? { authorization: `Bearer ${tokens.access_token}` } : {};
  const response = await fetch(path, { headers });
  output.textContent = `GET ${path} → ${response.status}\n${JSON.stringify(await response.json(), null, 2)}`;
}

document.querySelector('#logout').addEventListener('click', async () => {
  // 手元から消す前に、リフレッシュトークンを取り消す（盗まれていても使えなくする）。
  // discovery には revocation_endpoint が載っていないので、authorize の URL から組み立てる
  const tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
  if (tokens?.refresh_token) {
    await fetch(discovery.authorization_endpoint.replace('/oauth2/authorize', '/oauth2/revoke'), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: tokens.refresh_token, client_id: config.clientId }),
    });
  }
  sessionStorage.removeItem('tokens');
  // Hosted UI 側のログイン状態（Cookie）も消す。消さないと次のログインで画面が出ずに素通りする
  const url = new URL(discovery.authorization_endpoint.replace('/oauth2/authorize', '/logout'));
  url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: redirectUri });
  location.assign(url);
});
document.querySelector('#me').addEventListener('click', () => callApi('/me'));
document.querySelector('#admin').addEventListener('click', () => callApi('/admin/dashboard'));

await handleCallback();
render();
