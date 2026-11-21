import { cognitoEndpoint } from './cognito.js';
import { cognito, formValues } from './cognito.js'; // @since 03-03
import { config, show } from './cognito.js'; // @since 03-04

document.querySelector('#endpoint').textContent = cognitoEndpoint;
// @since 03-03

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
  // @since 03-04
  // Hosted UI 側のログイン状態（Cookie）も消す。消さないと、次に Hosted UI へ行ったとき画面が出ずに素通りする
  const url = new URL(discovery.authorization_endpoint.replace('/oauth2/authorize', '/logout'));
  url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: redirectUri });
  location.assign(url);
  // @end
});
// @end
// @since 03-04

// ---- Hosted UI（Authorization Code + PKCE）。流れを目で追うため、ライブラリを使わずに書く ----

// ログインのあとに戻ってくる URL。App Client の callback URL に登録したものと同じにする
const redirectUri = `${location.origin}/`;

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// 認可・トークンのエンドポイントは discovery が教えてくれる（本物の Cognito でも Floci でも同じ書き方）
const discovery = await (await fetch(`${config.issuer}/.well-known/openid-configuration`)).json();
document.querySelector('#authorize').textContent = discovery.authorization_endpoint;

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
    scope: 'openid email profile',
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

// Hosted UI から ?code=...&state=... を付けて戻ってきたら、認可コードをトークンに換える
async function handleCallback() {
  const params = new URLSearchParams(location.search);
  if (!params.has('code') && !params.has('error')) return;
  // 認可コードを URL に残さない（リロードや共有で漏れないように）
  history.replaceState(null, '', redirectUri);

  if (params.has('error')) {
    document.querySelector('#output').textContent = `ログインに失敗しました: ${params.get('error')} ${params.get('error_description') ?? ''}`;
    return;
  }
  const saved = JSON.parse(sessionStorage.getItem('pkce') ?? '{}');
  sessionStorage.removeItem('pkce');
  // 自分が出したリクエストへの応答かを state で確かめる（CSRF 対策）
  if (params.get('state') !== saved.state) {
    document.querySelector('#output').textContent = 'state が一致しません。ログインをやり直してください';
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
  show('token エンドポイント', response.status, json);
  if (!response.ok) return;
  // トークンエンドポイントの応答は snake_case。パスワードでログインしたときと同じ形にそろえて持つ
  saveTokens({ idToken: json.id_token, accessToken: json.access_token, refreshToken: json.refresh_token });
}

document.querySelector('#hosted-login').addEventListener('click', () => hostedLogin());
// @since 05-04
// Cognito に登録した IdP の名前（register-entra.sh の --provider-name）を渡す
document.querySelector('#entra-login').addEventListener('click', () => hostedLogin('EntraID'));
// @end
await handleCallback();
// @end
render(); // @since 03-03
