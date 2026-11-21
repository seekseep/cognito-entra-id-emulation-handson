import { cognitoEndpoint } from './cognito.js';
import { handleCallback } from './cognito.js'; // @since 04-04

document.querySelector('#endpoint').textContent = cognitoEndpoint;
// @since 04-04

// Entra ID でのサインインから ?code=... を付けて戻ってきたら、トークンに換えて、ログイン中の画面へ
if (await handleCallback()) location.replace('./home.html');
// @end
