// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶクライアントを用意する。
// AWS SDK for JavaScript v3 の Cognito の部分を、CDN（esm.sh）から読み込む。ある日から変わらないよう、版を固定する
import { CognitoIdentityProviderClient } from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';
export * from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
const configResponse = await fetch('/config.json', { cache: 'no-store' });
if (!configResponse.ok) {
  document.body.insertAdjacentHTML('afterbegin', '<p class="error">config.json がありません。<code>bash scripts/setup.sh</code> を流してから、読み込み直してください</p>');
  throw new Error('config.json がありません');
}
export const config = await configResponse.json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;

// Cognito の API を呼ぶクライアント。送り先を config.json の issuer のオリジン（Floci）に向ける。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
export const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1', endpoint: cognitoEndpoint });

export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// フォームの中の .message に、文を出す
export function showMessage(form, text, { error = false } = {}) {
  const message = form.querySelector('.message');
  message.textContent = text;
  message.classList.toggle('error', error);
}

// Cognito の例外の名前ごとに、利用者向けの文を決めておく（元の例外は、開発者ツールの Network タブで見られる）
const ERROR_MESSAGES = {
  UsernameExistsException: 'このユーザー名は、すでに使われています',
  InvalidPasswordException: 'パスワードは 8 文字以上で、英大文字・英小文字・数字を含めてください',
  CodeMismatchException: '確認コードが違います',
  ExpiredCodeException: '確認コードの期限が切れています',
  NotAuthorizedException: 'ユーザー名かパスワードが違います',
  // ユーザーがいるかどうかを、画面からは分からないようにする（パスワード違いと同じ文にする）
  UserNotFoundException: 'ユーザー名かパスワードが違います',
  UserNotConfirmedException: 'メールの確認が済んでいません。メールに届いた確認コードを入れてください',
};

export function showError(form, error) {
  showMessage(form, ERROR_MESSAGES[error.name] ?? `うまくいきませんでした（${error.name}）`, { error: true });
}

// ---- トークン ----

// 練習なので sessionStorage に置く（タブを閉じると消える）。XSS があると読まれてしまう場所なので、本番では置き場所を検討する
export function getTokens() {
  return JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
}

export function saveTokens(tokens) {
  if (tokens) sessionStorage.setItem('tokens', JSON.stringify(tokens));
  else sessionStorage.removeItem('tokens');
}

// JWT の真ん中（ペイロード）を読む。署名は確かめない（表示するだけなので）
export function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}

// ---- Hosted UI の仕組み（Authorization Code + PKCE）で、外部 IdP（Entra ID）でログインする。流れを目で追うため、ライブラリを使わずに書く ----

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
