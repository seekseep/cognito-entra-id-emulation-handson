// Hosted UI の仕組み（認可コード + PKCE）で、外部 IdP（Entra ID）でログインする。流れを目で追うため、ライブラリを使わずに書く
import { config } from './config.js';
import { saveTokens } from './tokens.js';

// ログインのあとに戻ってくる URL。App Client の callback URL に登録したものと同じにする
export const redirectUri = `${location.origin}/`;

function base64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomString() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

// 認可・トークンのエンドポイントは discovery が教えてくれる（本物の Cognito でも Floci でも同じ書き方）
const discovery = await (await fetch(`${config.issuer}/.well-known/openid-configuration`)).json();

export async function hostedLogin(identityProvider) {
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

// Hosted UI から ?code=...&state=... を付けて戻ってきたら、認可コードをトークンに換えて保存する。保存できたら true を返す
export async function handleCallback() {
  const params = new URLSearchParams(location.search);
  if (!params.has('code') && !params.has('error')) return false;
  // 認可コードを URL に残さない（リロードや共有で漏れないように）
  history.replaceState(null, '', redirectUri);

  if (params.has('error')) {
    document.querySelector('#message').textContent = `ログインに失敗しました（${params.get('error')}）`;
    return false;
  }
  const saved = JSON.parse(sessionStorage.getItem('pkce') ?? '{}');
  sessionStorage.removeItem('pkce');
  // 自分が出したリクエストへの応答かを state で確かめる（CSRF 対策）
  if (params.get('state') !== saved.state) {
    document.querySelector('#message').textContent = 'ログインをやり直してください（state が一致しません）';
    return false;
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
    document.querySelector('#message').textContent = `ログインに失敗しました（${json.error}）`;
    return false;
  }
  // トークンエンドポイントの応答は snake_case。パスワードでログインしたときと同じ形にそろえて持つ
  saveTokens({ idToken: json.id_token, accessToken: json.access_token, refreshToken: json.refresh_token });
  return true;
}

// Hosted UI 側のログイン状態（Cookie）も消す。消さないと、次に Hosted UI へ行ったとき画面が出ずに素通りする
export function hostedLogout() {
  const url = new URL(discovery.authorization_endpoint.replace('/oauth2/authorize', '/logout'));
  url.search = new URLSearchParams({ client_id: config.clientId, logout_uri: redirectUri });
  location.assign(url);
}
