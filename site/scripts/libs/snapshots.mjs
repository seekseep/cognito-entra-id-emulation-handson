/**
 * 「04 を終えた状態」（リポジトリ直下の project/）から引き算して、各レクチャーを終えた時点の
 * handson/ フォルダの中身を作るモジュール。
 *
 * - どのファイルがどのレクチャーで登場するかは project/lectures.json の files に書く
 * - ファイルの中で行が増える・差し替わる所は、コメントの目印で書く
 *
 *     // @since 02-02      … ここから @end までは 02-02 から入る（ブロック）
 *     // @until 03-01      … ここから @end までは 03-01 より前だけ（差し替えられる古い行）
 *     // @end
 *     foo(), // @since 02-02   … この 1 行だけ。行末の目印は消して出す
 *
 *   コメントは // と # と <!-- --> のどれでもよい。JSON にも // で書き、出すときに
 *   目印と行末のカンマの余りを取り除く（package.json は最終形の側では JSON として読めない）。
 *
 * レクチャー ID は「セクション番号-レクチャー番号」（sections/02-app/03-e2e → 02-03）。
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { walkFiles } from './fs-walk.mjs';
import { ROOT } from './paths.mjs';

export const PROJECT_DIR = path.join(ROOT, 'project');
export const MANIFEST = 'lectures.json';
// 受講者の手元のフォルダ名。ZIP のルートと、各レクチャーに置く状態のフォルダ名を兼ねる
export const SNAPSHOT_DIRNAME = 'handson';

const BLOCK_RE = /^\s*(?:\/\/|#|<!--)\s*@(since|until|end)(?:\s+(\d\d-\d\d))?\s*(?:-->)?\s*$/;
const INLINE_RE = /\s+(?:\/\/|#)\s*@(since|until)\s+(\d\d-\d\d)\s*(?:-->)?\s*$/;

let manifestCache;

export async function loadManifest() {
  if (!manifestCache) {
    manifestCache = JSON.parse(await readFile(path.join(PROJECT_DIR, MANIFEST), 'utf8'));
  }
  return manifestCache;
}

/** `01-cognito/03-tokens-and-groups` → `01-03` */
export function lectureIdOf(sec, lec) {
  return `${sec.slice(0, 2)}-${lec.slice(0, 2)}`;
}

function indexOf(lectures, id) {
  const i = lectures.indexOf(id);
  if (i === -1) throw new Error(`[snapshots] lectures.json の lectures に ${id} がありません`);
  return i;
}

/** 目印を解いて、レクチャー id の時点の中身にする。 */
export function renderSource(source, relPath, id, lectures) {
  const at = indexOf(lectures, id);
  const visible = (kind, lecture) => (kind === 'since' ? at >= indexOf(lectures, lecture) : at < indexOf(lectures, lecture));

  const stack = [];
  const out = [];
  source.split('\n').forEach((line, n) => {
    const block = line.match(BLOCK_RE);
    if (block) {
      const [, kind, lecture] = block;
      if (kind === 'end') {
        if (!stack.pop()) throw new Error(`[snapshots] ${relPath}:${n + 1} 対応する @since / @until が無い @end`);
      } else {
        if (!lecture) throw new Error(`[snapshots] ${relPath}:${n + 1} @${kind} にレクチャー ID がありません`);
        stack.push({ show: visible(kind, lecture) });
      }
      return;
    }
    if (!stack.every((s) => s.show)) return;
    const inline = line.match(INLINE_RE);
    if (inline) {
      if (!visible(inline[1], inline[2])) return;
      out.push(line.replace(INLINE_RE, ''));
      return;
    }
    out.push(line);
  });
  if (stack.length > 0) throw new Error(`[snapshots] ${relPath} の @since / @until が @end で閉じていません`);

  let text = out.join('\n');
  if (relPath.endsWith('.json')) text = text.replace(/,(\s*[}\]])/g, '$1');
  return text;
}

/**
 * レクチャー id を終えた時点の handson/ の中身。Map<相対パス, 中身>（パスは名前順）。
 */
export async function buildSnapshot(id) {
  const manifest = await loadManifest();
  const { lectures, files } = manifest;
  const at = indexOf(lectures, id);

  const all = await walkFiles(PROJECT_DIR, { ignoreDirs: new Set(['node_modules', 'dist']), ignoreNames: new Set(['.DS_Store', MANIFEST]) });
  for (const rel of all) {
    if (!files[rel]) throw new Error(`[snapshots] project/${rel} が lectures.json の files にありません（いつ登場するかを書いてください）`);
  }
  const snapshot = new Map();
  for (const rel of all.sort()) {
    if (at < indexOf(lectures, files[rel].since)) continue;
    const source = await readFile(path.join(PROJECT_DIR, ...rel.split('/')), 'utf8');
    snapshot.set(rel, renderSource(source, rel, id, lectures));
  }
  return snapshot;
}

/** 1 つ前のレクチャー ID（最初なら null）。 */
export async function previousLectureId(id) {
  const { lectures } = await loadManifest();
  const i = indexOf(lectures, id);
  return i === 0 ? null : lectures[i - 1];
}

/** project/ に状態を持つレクチャーか。 */
export async function hasSnapshot(id) {
  const { lectures } = await loadManifest();
  return lectures.includes(id);
}

/**
 * 前のレクチャーからの変化。{ added: Set, changed: Set, removed: Set }。
 */
export async function changesOf(id) {
  const current = await buildSnapshot(id);
  const prevId = await previousLectureId(id);
  const previous = prevId ? await buildSnapshot(prevId) : new Map();
  const added = new Set();
  const changed = new Set();
  const removed = new Set();
  for (const [rel, text] of current) {
    if (!previous.has(rel)) added.add(rel);
    else if (previous.get(rel) !== text) changed.add(rel);
  }
  for (const rel of previous.keys()) if (!current.has(rel)) removed.add(rel);
  return { current, previous, added, changed, removed };
}

/**
 * before → after で「足された行」の行番号（1 始まり）。最長共通部分列で比べる。
 * 差し替えられた行も、新しい側では足された行として数える。
 */
export function addedLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const dp = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const lines = [];
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      i++;
      j++;
    } else if (i < a.length && dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      lines.push(j + 1);
      j++;
    }
  }
  return lines;
}
