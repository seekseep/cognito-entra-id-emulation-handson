// 簡易エディタ UI（remark-editor.mjs が生成する `.editor`）のファイル切り替え。
// 左のファイルボタンを押すと、対応するコードペインだけを表示する。
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

  function setFull(editor, on) {
    editor.classList.toggle('is-fullscreen', on);
    var btn = editor.querySelector('.editor__fullscreen');
    if (btn) {
      btn.setAttribute('aria-pressed', String(on));
      btn.title = on ? '全画面を閉じる' : '全画面で見る';
      btn.querySelector('.editor__fullscreen-label').textContent = on ? '閉じる' : '全画面';
    }
  }

  document.addEventListener('fullscreenchange', function () {
    document.querySelectorAll('.editor').forEach(function (editor) {
      setFull(editor, document.fullscreenElement === editor);
    });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.editor.is-fullscreen').forEach(function (editor) {
      if (document.fullscreenElement !== editor) setFull(editor, false);
    });
  });

  function setup() {
    document.querySelectorAll('.editor').forEach(function (editor) {
      // 最初に開いているファイルが一覧の下のほうにあっても見えるよう、一覧だけをスクロールしておく（ページは動かさない）
      var active = editor.querySelector('.editor__file.is-active');
      var list = editor.querySelector('.editor__files');
      if (active && list && list.scrollHeight > list.clientHeight) {
        list.scrollTop = Math.max(0, active.offsetTop - list.offsetTop - list.clientHeight / 3);
      }
      var fullscreen = editor.querySelector('.editor__fullscreen');
      if (fullscreen) {
        fullscreen.addEventListener('click', function () {
          // Fullscreen API が使えればそれで、使えない（iPhone の Safari など）ときは画面いっぱいに広げる class で代わりにする
          if (document.fullscreenElement === editor) return document.exitFullscreen();
          if (editor.classList.contains('is-fullscreen')) return setFull(editor, false);
          if (editor.requestFullscreen) {
            editor.requestFullscreen().catch(function () { setFull(editor, true); });
          } else {
            setFull(editor, true);
          }
        });
      }
      editor.querySelectorAll('.editor__file').forEach(function (btn) {
        btn.addEventListener('click', function () {
          activate(editor, btn.dataset.file);
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
