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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
