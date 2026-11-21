import { config } from './lib/config.js';
import { client, ConfirmSignUpCommand } from './lib/cognito.js';
import { formValues, showMessage, showError } from './lib/form.js';

// サインアップの画面から来たときは、ユーザー名を入れておく
document.querySelector('#confirm [name=username]').value = new URLSearchParams(location.search).get('username') ?? '';

document.querySelector('#confirm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const { username, code } = formValues(event.target);
  try {
    await client.send(new ConfirmSignUpCommand({ ClientId: config.clientId, Username: username, ConfirmationCode: code }));
    showMessage(event.target, '確認できました。ログインできます');
  } catch (error) {
    showError(event.target, error);
  }
});

// スクリプトの準備ができてから押せるようにする（その前に押すと、ブラウザがフォームをふつうに送り、パスワードが URL に載ってしまう）
document.querySelector('#confirm button').disabled = false;
