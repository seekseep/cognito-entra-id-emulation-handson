const output = document.querySelector('#output');

// 練習なので sessionStorage に置く。本番では XSS で盗まれにくい置き場所（httpOnly の Cookie など）を検討する
let tokens = JSON.parse(sessionStorage.getItem('tokens') ?? 'null');

function saveTokens(next) {
  tokens = next;
  if (tokens) sessionStorage.setItem('tokens', JSON.stringify(tokens));
  else sessionStorage.removeItem('tokens');
  render();
}

function show(label, status, body) {
  output.textContent = `${label} → ${status}\n${JSON.stringify(body, null, 2)}`;
}

async function call(method, path, body) {
  const headers = { 'content-type': 'application/json' };
  if (tokens?.accessToken) headers.authorization = `Bearer ${tokens.accessToken}`;
  const response = await fetch(path, { method, headers, body: body && JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  show(`${method} ${path}`, response.status, json);
  return { ok: response.ok, json };
}

function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

function render() {
  const claims = tokens?.idToken ? decodeJwt(tokens.idToken) : null;
  document.querySelector('#status').textContent = claims ? `${claims['cognito:username']} としてログイン中` : 'ログインしていません';
  document.querySelector('#id-token').textContent = claims ? JSON.stringify(claims, null, 2) : 'ログインすると表示します'; // @since 03-01
}

document.querySelector('#signup').addEventListener('submit', async (event) => {
  event.preventDefault();
  await call('POST', '/auth/signup', formValues(event.target));
});

document.querySelector('#confirm').addEventListener('submit', async (event) => {
  event.preventDefault();
  await call('POST', '/auth/confirm', formValues(event.target));
});

document.querySelector('#login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { ok, json } = await call('POST', '/auth/login', formValues(event.target));
  if (ok && json.accessToken) saveTokens(json);
});

document.querySelector('#me').addEventListener('click', () => call('GET', '/me'));
document.querySelector('#admin').addEventListener('click', () => call('GET', '/admin/dashboard'));

document.querySelector('#refresh').addEventListener('click', async () => {
  if (!tokens) return show('refresh', '-', { message: '先にログインしてください' });
  const { ok, json } = await call('POST', '/auth/refresh', { refreshToken: tokens.refreshToken });
  // REFRESH_TOKEN_AUTH の応答にはリフレッシュトークンが入らない。手元のものを使い続ける
  if (ok) saveTokens({ ...json, refreshToken: tokens.refreshToken });
});

document.querySelector('#logout').addEventListener('click', async () => {
  // 手元から消す前に、リフレッシュトークンを Cognito で取り消す（盗まれていても使えなくする）。
  // Hosted UI でもらったトークンも同じクライアントのものなので、同じ API で取り消せる
  if (tokens?.refreshToken) await call('POST', '/auth/logout', { refreshToken: tokens.refreshToken });
  saveTokens(null);
  // @since 03-01
  // Hosted UI 側のログイン状態（Cookie）も消す。消さないと次のログインで画面が出ずに素通りする
  const url = new URL(discovery.authorization_endpoint.replace('/oauth2/authorize', '/logout'));
  url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: redirectUri });
  location.assign(url);
  // @end
});
// @since 03-01

// ---- Hosted UI（Authorization Code + PKCE）。流れを目で追うため、ライブラリを使わずに書く ----
const redirectUri = `${location.origin}/`;

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// どの User Pool に、どのクライアントとして行くかは API（/config）から教えてもらう
const config = await (await fetch('/config')).json();
// 認可・トークンのエンドポイントは discovery が教えてくれる（本物の Cognito でも Floci でも同じ書き方）
const discovery = await (await fetch(`${config.issuer}/.well-known/openid-configuration`)).json();
document.querySelector('#issuer').textContent = discovery.authorization_endpoint;

async function hostedLogin(identityProvider) {
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
  const json = await response.json();
  if (!response.ok) {
    output.textContent = `トークンをもらえませんでした: ${JSON.stringify(json)}`;
    return;
  }
  // トークンエンドポイントの応答は snake_case。パスワードでログインしたときと同じ形にそろえて持つ
  saveTokens({ idToken: json.id_token, accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in });
}

// Cognito のログイン画面へのボタンと、User Pool に登録した外部 IdP ごとのボタンを並べる
const buttons = document.querySelector('#login-buttons');
for (const name of [null, ...config.identityProviders]) {
  const button = document.createElement('button');
  button.textContent = name ? `${name} でログイン` : 'Cognito のログイン画面へ';
  button.addEventListener('click', () => hostedLogin(name ?? undefined));
  buttons.append(button);
}

await handleCallback();
// @end
render();
