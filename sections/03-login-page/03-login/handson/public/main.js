import { cognitoEndpoint } from './cognito.js';
import { client, config, formValues, show, InitiateAuthCommand, RevokeTokenCommand } from './cognito.js';

document.querySelector('#endpoint').textContent = cognitoEndpoint;

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
  try {
    const result = await client.send(new InitiateAuthCommand({
      ClientId: config.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }));
    show('InitiateAuth', result);
    // 管理者が作ったユーザーの初回ログインなどでは、トークンの代わりにチャレンジ（ChallengeName）が返る
    const auth = result.AuthenticationResult;
    if (auth) saveTokens({ idToken: auth.IdToken, accessToken: auth.AccessToken, refreshToken: auth.RefreshToken });
  } catch (error) {
    show('InitiateAuth', error);
  }
});

document.querySelector('#logout').addEventListener('click', async () => {
  // 手元から消す前に、リフレッシュトークンを Cognito で取り消す（盗まれていても使えなくする）
  if (tokens?.refreshToken) {
    await client.send(new RevokeTokenCommand({ ClientId: config.clientId, Token: tokens.refreshToken }));
    show('RevokeToken', {});
  }
  saveTokens(null);
});
render();
