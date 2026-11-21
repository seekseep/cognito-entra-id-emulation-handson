import { config } from './lib/config.js';
import { client, InitiateAuthCommand } from './lib/cognito.js';
import { formValues, showMessage, showError } from './lib/form.js';
import { saveTokens } from './lib/tokens.js';
import { hostedLogin } from './lib/hosted-ui.js';

document.querySelector('#login').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, password } = formValues(event.target);
  try {
    const result = await client.send(new InitiateAuthCommand({
      ClientId: config.clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }));
    // 管理者が作ったユーザーの初回ログインなどでは、トークンの代わりにチャレンジ（ChallengeName）が返る
    const auth = result.AuthenticationResult;
    if (!auth) return showMessage(event.target, `続けるには追加の手続きが要ります（${result.ChallengeName}）`, { error: true });
    saveTokens({ idToken: auth.IdToken, accessToken: auth.AccessToken, refreshToken: auth.RefreshToken });
    // ログイン中の画面へ
    location.assign('./home.html');
  } catch (error) {
    showError(event.target, error);
  }
});

// スクリプトの準備ができてから押せるようにする（その前に押すと、ブラウザがフォームをふつうに送り、パスワードが URL に載ってしまう）
document.querySelector('#login button').disabled = false;

// Cognito に登録した IdP の名前（register-entra.sh の --provider-name）を渡す
document.querySelector('#entra-login').addEventListener('click', () => hostedLogin('EntraID'));
