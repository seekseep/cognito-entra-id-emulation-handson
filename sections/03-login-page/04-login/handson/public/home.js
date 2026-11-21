import { config } from './lib/config.js';
import { client, RevokeTokenCommand } from './lib/cognito.js';
import { getTokens, saveTokens, decodeJwt } from './lib/tokens.js';

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
  location.assign('./login.html');
});
