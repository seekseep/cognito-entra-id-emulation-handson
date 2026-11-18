/**
 * 本文の抜粋（手で書いたコードフェンス）が、handson/ のどのファイルの何行目かを探し、
 * 行番号と「全体を確認する」ボタンを付ける。handson-sentinels.mjs の expandHandsonSentinels から呼ばれる。
 *
 * 対象
 *   - 言語が ts / js / yaml / json などのフェンスは、そのレクチャーの handson/ から自動で探す
 *   - bash などは、打つコマンドと区別できないので、meta に file="scripts/setup.sh" を書いたものだけ
 *   - meta に nofile と書くと探さない（ファイルに無い、説明のためのコード）
 *
 * 照らし合わせ方（抜粋は手で短くしてあるので、少しゆるく見る）
 *   - 行頭の字下げと、行末のコメント（` // …`・` # …`）は無視する
 *   - ファイル側のコメントだけの行・空行は、抜粋に無ければ飛ばしてよい
 *   - 抜粋の `// ...`・`# ...`・`…` の行は「ここを省いた」の印。ファイルの何行でも飛ばせる
 *   - 行の途中の `...`・`…` は、その行の途中を省いた印。前後が合っていればよい
 *
 * 出力（remark に渡す Markdown。HTML ブロックとコードフェンスの組み合わせ）
 *   <div class="excerpt" data-lines="20,21,,23">  … 抜粋の各行の、ファイルでの行番号（省いた印の行は空）
 *     <p class="excerpt__bar">ファイル名・何行目・「全体を確認する」ボタン</p>
 *     抜粋のフェンス（そのまま）
 *     <div class="excerpt__full" hidden>ファイル全体のフェンス（抜粋の範囲に mark）</div>
 *   </div>
 * 行番号を振る・開け閉めするのは site/src/scripts/editor-client.js、見た目は editor.css。
 */

const AUTO_LANGS = new Set(['ts', 'js', 'mjs', 'yaml', 'yml', 'json', 'html', 'css', 'ini', 'dockerfile']);
const FENCE_OPEN_RE = /^(`{3,}|~{3,})(\S*)(.*)$/;
const GAP_RE = /^(\/\/\s*|#\s*|\/\*\s*)?(…|\.{3})(\s*\*\/)?$/;

// 先に前後の空白を落としてから、中身のあとに続くコメントだけを消す（行まるごとのコメントは残す）
const norm = (line) =>
  line
    .trim()
    .replace(/\s+(\/\/|#)\s.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
const isCommentOnly = (n) => /^(\/\/|#|\/\*|\*)/.test(n);

/** 抜粋の 1 行 e が、ファイルの 1 行 f に合うか。行の途中の ... / … は「途中を省いた」として前後だけを見る */
function same(f, e) {
  if (f === undefined) return false;
  if (f === e) return true;
  const m = e.match(/^(.*?)\s?(?:\.{3}|…)\s?(.*)$/);
  if (!m || (!m[1] && !m[2])) return false;
  return f.startsWith(m[1]) && f.endsWith(m[2]) && f.length >= m[1].length + m[2].length;
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * 抜粋 excerpt（行の配列）を、ファイルの i 行目（0 始まり）から当てはめる。
 * 当てはまれば、抜粋の各行に対応するファイルの行（0 始まり。省いた印・合わない空行は null）を返す。
 */
function alignAt(fileNorm, i, excerpt) {
  const map = [];
  let j = i;
  for (let k = 0; k < excerpt.length; k++) {
    const e = excerpt[k];
    if (GAP_RE.test(e)) {
      map.push(null);
      // 次の中身のある行まで、ファイルを読み飛ばす
      const next = excerpt.slice(k + 1).find((x) => x && !GAP_RE.test(x));
      if (next === undefined) return map;
      while (j < fileNorm.length && !same(fileNorm[j], next)) j++;
      if (j >= fileNorm.length) return null;
      continue;
    }
    if (e === '') {
      if (fileNorm[j] === '') {
        map.push(j);
        j++;
      } else {
        map.push(null);
      }
      continue;
    }
    // 抜粋に無いコメントだけの行・空行は飛ばしてよい
    while (j < fileNorm.length && !same(fileNorm[j], e) && (fileNorm[j] === '' || isCommentOnly(fileNorm[j]))) j++;
    if (!same(fileNorm[j], e)) return null;
    map.push(j);
    j++;
  }
  return map;
}

/** files（rel → 全文）の中から、抜粋がちょうど 1 か所に当てはまる所を探す。 */
export function locateExcerpt(text, files) {
  const excerpt = text.split('\n').map(norm);
  while (excerpt.length && excerpt.at(-1) === '') excerpt.pop();
  const first = excerpt.find((x) => x && !GAP_RE.test(x));
  if (!first) return { hits: [] };
  const hits = [];
  for (const [rel, body] of files) {
    const fileNorm = body.split('\n').map(norm);
    for (let i = 0; i < fileNorm.length; i++) {
      if (!same(fileNorm[i], first)) continue;
      // 抜粋の頭が省いた印や空行のときに備え、頭からの並びで当てはめ直す
      const lead = excerpt.indexOf(first);
      const map = alignAt(fileNorm, i, excerpt.slice(lead));
      if (map) hits.push({ rel, map: [...Array(lead).fill(null), ...map] });
    }
  }
  return { hits };
}

/** `20,21,,23` → `{20-21,23}`（Expressive Code の mark=） */
function markRanges(numbers) {
  const ns = [...new Set(numbers.filter((n) => n != null))].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < ns.length; i++) {
    let j = i;
    while (j + 1 < ns.length && ns[j + 1] === ns[j] + 1) j++;
    parts.push(i === j ? `${ns[i]}` : `${ns[i]}-${ns[j]}`);
    i = j;
  }
  return `{${parts.join(',')}}`;
}

function fenceFor(text) {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return '`'.repeat(longest + 1);
}

function render({ rel, numbers, open, inner, close, lang, fullText }) {
  const shown = numbers.filter((n) => n != null);
  const from = Math.min(...shown);
  const to = Math.max(...shown);
  const range = from === to ? `${from} 行目` : `${from}〜${to} 行目`;
  const full = fullText.replace(/\n+$/, '');
  const fullFence = fenceFor(full);
  return [
    `<div class="excerpt" data-file="${escapeHtml(rel)}" data-lines="${numbers.map((n) => n ?? '').join(',')}">`,
    '',
    `<p class="excerpt__bar"><code class="excerpt__file">${escapeHtml(rel)}</code><span class="excerpt__range">${range}</span><button class="excerpt__toggle" type="button" aria-expanded="false">全体を確認する</button></p>`,
    '',
    open,
    ...inner,
    close,
    '',
    `<div class="excerpt__full" hidden>`,
    '',
    `${fullFence}${lang} title="${rel}" mark=${markRanges(numbers)}`,
    full,
    fullFence,
    '',
    '</div>',
    '',
    '</div>',
  ];
}

/**
 * 本文の中の抜粋を探して、行番号と「全体を確認する」を付ける。
 * files は、このレクチャーを終えた handson/ の中身（rel → 全文）。
 */
export function expandExcerpts(body, files, { where, langOf }) {
  const lines = body.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(FENCE_OPEN_RE);
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    // フェンスの終わりまでを集める
    const fence = m[1];
    let end = i + 1;
    while (end < lines.length && !(lines[end].startsWith(fence) && lines[end].slice(fence.length).trim() === '')) end++;
    const inner = lines.slice(i + 1, end);
    const open = lines[i];
    const close = lines[end] ?? fence;
    i = end;

    const lang = m[2];
    const meta = m[3];
    const explicit = meta.match(/\bfile="([^"]+)"/)?.[1];
    const skip = /\bnofile\b/.test(meta) || (!explicit && !AUTO_LANGS.has(lang));
    if (skip) {
      out.push(open, ...inner, close);
      continue;
    }
    const candidates = explicit ? new Map(files.has(explicit) ? [[explicit, files.get(explicit)]] : []) : files;
    const { hits } = locateExcerpt(inner.join('\n'), candidates);
    if (hits.length !== 1) {
      const head = inner.find((l) => l.trim()) ?? '';
      const why = hits.length ? `${hits.length} か所に当てはまります（${hits.map((h) => h.rel).join('、')}）` : 'handson/ のどのファイルにも見つかりません';
      console.warn(`[handson] ${where}: 抜粋「${head.trim().slice(0, 50)}」が${why}。file="..." か nofile を書いてください`);
      out.push(open, ...inner, close);
      continue;
    }
    const { rel, map } = hits[0];
    const numbers = map.map((n) => (n == null ? null : n + 1));
    // 抜粋のフェンスからは file= を外す（Expressive Code には要らない）
    const cleanOpen = explicit ? open.replace(/\s*\bfile="[^"]+"/, '') : open;
    out.push(...render({ rel, numbers, open: cleanOpen, inner, close, lang: langOf(rel), fullText: files.get(rel) }));
  }
  return out.join('\n');
}
