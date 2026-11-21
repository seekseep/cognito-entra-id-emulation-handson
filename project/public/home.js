import { config } from './lib/config.js';
import { client, RevokeTokenCommand } from './lib/cognito.js';
import { getTokens, saveTokens, decodeJwt } from './lib/tokens.js';
import { hostedLogout } from './lib/hosted-ui.js'; // @since 04-04

const tokens = getTokens();
if (tokens) {
  const claims = decodeJwt(tokens.idToken);
  document.querySelector('#status').textContent = `${claims['cognito:username']} としてログイン中`;
  document.querySelector('#id-token').textContent = JSON.stringify(claims, null, 2);
}

document.querySelector('#logout').addEventListener('click', async () => {
  // 手元から消す前に、リフレッシュトークンを Cognito で取り消す（盗まれていても使えなくする）
  if (tokens) await client.send(new RevokeTokenCommand({ ClientId: config.clientId, Token: tokens.refreshToken }));
  saveTokens(null);
  // @until 04-04
  location.assign('./login.html');
  // @end
  // @since 04-04
  // Entra ID でログインしたときのために、Hosted UI 側のログイン状態も消す（そのあとトップに戻る）
  hostedLogout();
  // @end
});
