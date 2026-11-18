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
});
render();
