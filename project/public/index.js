import { cognitoEndpoint } from './lib/config.js';
import { handleCallback } from './lib/hosted-ui.js'; // @since 04-04

document.querySelector('#endpoint').textContent = cognitoEndpoint;
// @since 04-04

// Entra ID でのログインから ?code=... を付けて戻ってきたら、トークンに換えて、ログイン中の画面へ
if (await handleCallback()) location.replace('./home.html');
// @end
