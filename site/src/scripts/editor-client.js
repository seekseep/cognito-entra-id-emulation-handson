// 簡易エディタ UI（remark-editor.mjs が生成する `.editor`）の挙動。
// - 左のファイルボタンを押すと、対応するコードペインだけを表示する
// - ヘッダの「全画面」ボタンで、エディタだけを画面いっぱいに広げる
//   Fullscreen API を使い、使えないとき（iPhone の Safari など）は position: fixed で代わりにする
// `.editor` が無いページでは何もしない。全ページの <head> に inline 注入される。
(function () {
  function activate(editor, file) {
    editor.querySelectorAll('.editor__file').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.dataset.file === file);
    });
    editor.querySelectorAll('.editor__pane').forEach(function (pane) {
      pane.classList.toggle('is-active', pane.dataset.file === file);
    });
  }

  // ---- 全画面 ----

  function fullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function requestFullscreen(el) {
    var fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!fn || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) return null;
    try {
      // 古い Safari は Promise を返さない
      return Promise.resolve(fn.call(el));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  function exitFullscreen() {
    var fn = document.exitFullscreen || document.webkitExitFullscreen;
    if (fn) fn.call(document);
  }

  // 見た目（クラス・ボタンの文言）を、全画面かどうかに合わせる
  function render(editor, on) {
    editor.classList.toggle('is-fullscreen', on);
    var btn = editor.querySelector('.editor__fullscreen');
    if (!btn) return;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.title = on ? '全画面を閉じる（Esc）' : '全画面で開く';
    var label = btn.querySelector('.editor__fullscreen-label');
    if (label) label.textContent = on ? '閉じる' : '全画面';
  }

  // 代わりの全画面（position: fixed）
  function setFallback(editor, on) {
    editor.classList.toggle('is-fallback-fullscreen', on);
    document.documentElement.classList.toggle('has-editor-fullscreen', on);
    render(editor, on);
  }

  function toggleFullscreen(editor) {
    if (editor.classList.contains('is-fallback-fullscreen')) {
      setFallback(editor, false);
      return;
    }
    if (fullscreenElement() === editor) {
      exitFullscreen();
      return;
    }
    var req = requestFullscreen(editor);
    if (!req) {
      setFallback(editor, true);
      return;
    }
    req.catch(function () {
      setFallback(editor, true);
    });
  }

  function onFullscreenChange() {
    var current = fullscreenElement();
    document.querySelectorAll('.editor').forEach(function (editor) {
      if (editor.classList.contains('is-fallback-fullscreen')) return;
      render(editor, current === editor);
    });
  }

  function setup() {
    document.querySelectorAll('.editor').forEach(function (editor) {
      // 最初に開いているファイルが一覧の下のほうにあっても見えるよう、一覧だけをスクロールしておく（ページは動かさない）
      var active = editor.querySelector('.editor__file.is-active');
      var list = editor.querySelector('.editor__files');
      if (active && list && list.scrollHeight > list.clientHeight) {
        list.scrollTop = Math.max(0, active.offsetTop - list.offsetTop - list.clientHeight / 3);
      }
      editor.querySelectorAll('.editor__file').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activate(editor, btn.dataset.file);
        });
      });
      var fs = editor.querySelector('.editor__fullscreen');
      if (fs) {
        fs.addEventListener('click', function () {
          toggleFullscreen(editor);
        });
      }
    });

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    // 代わりの全画面は Esc で閉じる（本物の全画面はブラウザが Esc を受け持つ）
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      document.querySelectorAll('.editor.is-fallback-fullscreen').forEach(function (editor) {
        setFallback(editor, false);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
