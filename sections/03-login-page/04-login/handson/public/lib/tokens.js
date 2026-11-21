// ログインで受け取ったトークンを、どの画面からも読めるように保存する

// 練習なので sessionStorage に置く（タブを閉じると消える）。XSS があると読まれてしまう場所なので、本番では置き場所を検討する
export function getTokens() {
  return JSON.parse(sessionStorage.getItem('tokens') ?? 'null');
}

export function saveTokens(tokens) {
  if (tokens) sessionStorage.setItem('tokens', JSON.stringify(tokens));
  else sessionStorage.removeItem('tokens');
}

// JWT の真ん中（ペイロード）を読む。署名は確かめない（表示するだけなので）
export function decodeJwt(token) {
  const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(decodeURIComponent(escape(atob(payload))));
}
