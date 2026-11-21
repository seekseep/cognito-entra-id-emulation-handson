import { cognitoEndpoint } from './lib/config.js';
import { handleCallback } from './lib/hosted-ui.js';

document.querySelector('#endpoint').textContent = cognitoEndpoint;

// Entra ID でのログインから ?code=... を付けて戻ってきたら、トークンに換えて、ログイン中の画面へ
if (await handleCallback()) location.replace('./home.html');
