import { config } from './lib/config.js';
import { client, SignUpCommand } from './lib/cognito.js';
import { formValues, showError } from './lib/form.js';

document.querySelector('#signup').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, email, password } = formValues(event.target);
  try {
    await client.send(new SignUpCommand({
      ClientId: config.clientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: email }],
    }));
    // 登録できたら、メールに届いた確認コードを入れる画面へ
    location.assign(`./confirm.html?username=${encodeURIComponent(username)}`);
  } catch (error) {
    showError(event.target, error);
  }
});

// スクリプトの準備ができてから押せるようにする（その前に押すと、ブラウザがフォームをふつうに送り、パスワードが URL に載ってしまう）
document.querySelector('#signup button').disabled = false;
