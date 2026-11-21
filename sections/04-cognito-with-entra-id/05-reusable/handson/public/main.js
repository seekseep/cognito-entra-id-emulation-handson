import { cognitoEndpoint } from './cognito.js';
import { handleCallback } from './cognito.js';

document.querySelector('#endpoint').textContent = cognitoEndpoint;

// Entra ID でのログインから ?code=... を付けて戻ってきたら、トークンに換えて、ログイン中の画面へ
if (await handleCallback()) location.replace('./home.html');
