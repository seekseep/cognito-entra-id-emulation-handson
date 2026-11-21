// どの画面でも使う部分。設定を読み、Cognito の API を呼ぶクライアントを用意する。
// AWS SDK for JavaScript v3 の Cognito の部分を、CDN（esm.sh）から読み込む。ある日から変わらないよう、版を固定する
import { CognitoIdentityProviderClient } from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';
export * from 'https://esm.sh/@aws-sdk/client-cognito-identity-provider@3.1163.0';

// どの User Pool に、どのクライアントとして行くかは、setup が書き出す config.json から読む（作り直したときに古い値を使わないよう、キャッシュしない）
export const config = await (await fetch('/config.json', { cache: 'no-store' })).json();
// Cognito の API の入口は、issuer のオリジン（Floci は http://localhost:4566、本物は https://cognito-idp.<リージョン>.amazonaws.com）
export const cognitoEndpoint = new URL(config.issuer).origin;

// Cognito の API を呼ぶクライアント。送り先を config.json の issuer のオリジン（Floci）に向ける。
// SignUp・InitiateAuth などは、AWS の認証情報（署名）なしで、クライアント ID だけで呼べる
export const client = new CognitoIdentityProviderClient({ region: 'ap-northeast-1', endpoint: cognitoEndpoint });

export function formValues(form) {
  return Object.fromEntries(new FormData(form));
}

// フォームの中の .message に、文を出す
export function showMessage(form, text, { error = false } = {}) {
  const message = form.querySelector('.message');
  message.textContent = text;
  message.classList.toggle('error', error);
}

// Cognito の例外の名前ごとに、利用者向けの文を決めておく（元の例外は、開発者ツールの Network タブで見られる）
const ERROR_MESSAGES = {
  UsernameExistsException: 'このユーザー名は、すでに使われています',
  InvalidPasswordException: 'パスワードは 8 文字以上で、英大文字・英小文字・数字を含めてください',
  CodeMismatchException: '確認コードが違います',
  ExpiredCodeException: '確認コードの期限が切れています',
  NotAuthorizedException: 'ユーザー名かパスワードが違います',
  // ユーザーがいるかどうかを、画面からは分からないようにする（パスワード違いと同じ文にする）
  UserNotFoundException: 'ユーザー名かパスワードが違います',
  UserNotConfirmedException: 'メールの確認が済んでいません。メールに届いた確認コードを入れてください',
};

export function showError(form, error) {
  showMessage(form, ERROR_MESSAGES[error.name] ?? `うまくいきませんでした（${error.name}）`, { error: true });
}
