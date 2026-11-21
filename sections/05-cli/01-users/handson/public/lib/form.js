// フォームの値を読み、フォームの中にメッセージやエラーを出す

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
