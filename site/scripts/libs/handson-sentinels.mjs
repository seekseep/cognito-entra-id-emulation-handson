/**
 * 積み上げ方式（project/ → 各レクチャーの handson/）のための本文センチネル。
 * sentinels.mjs の expandSentinels から呼ばれる。
 *
 *   ::changes             … このレクチャーで足す・変えるファイルの表（役割は project/lectures.json の about）
 *   ::file{path="..."}    … そのファイルの全文を、開いて読める折りたたみ（<details>）で置く。
 *                           前のレクチャーから変えたファイルは、足した行に印を付ける
 *   ::codeview            … このレクチャーを終えた handson/ 全体をエディタで見せる（ページの最後に置く）。
 *                           ファイル一覧に「新規」「変更」を付け、足したファイルを最初に開く
 *   ::timeline            … どのレクチャーで、どのファイルが増えるかの一覧（レクチャー以外のページでも使える）
 */

import { SNAPSHOT_DIRNAME, addedLines, buildSnapshot, changesOf, loadManifest } from './snapshots.mjs';

const CHANGES_RE = /^::changes\s*$/;
const FILE_RE = /^::file\{path="([^"]+)"\}\s*$/;
const TIMELINE_RE = /^::timeline\s*$/;

export const STATUS_LABEL = { added: '新規', changed: '変更' };

/** エディタと折りたたみで使うコードの言語。 */
export function langOf(rel) {
  const name = rel.split('/').pop();
  if (name === 'Containerfile') return 'dockerfile';
  if (name.startsWith('.env')) return 'ini';
  if (name === '.gitignore' || name === '.containerignore') return 'ini';
  const ext = name.includes('.') ? name.split('.').pop() : '';
  return { ts: 'ts', mjs: 'js', js: 'js', sh: 'bash', json: 'json', yaml: 'yaml', yml: 'yaml', html: 'html', css: 'css', md: 'md' }[ext] ?? 'txt';
}

/** `{1,3-5}` の形にまとめる（Expressive Code の ins= に渡す）。 */
function ranges(lines) {
  const parts = [];
  for (let i = 0; i < lines.length; i++) {
    let j = i;
    while (j + 1 < lines.length && lines[j + 1] === lines[j] + 1) j++;
    parts.push(i === j ? `${lines[i]}` : `${lines[i]}-${lines[j]}`);
    i = j;
  }
  return `{${parts.join(',')}}`;
}

// コードの中に ``` があってもフェンスが閉じないよう、中身より長いフェンスを使う
function fenceFor(text) {
  const longest = Math.max(2, ...[...text.matchAll(/`+/g)].map((m) => m[0].length));
  return '`'.repeat(longest + 1);
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function badge(status) {
  return status ? `<span class="file-badge file-badge--${status}">${STATUS_LABEL[status]}</span>` : '';
}

function statusOf(rel, { added, changed }) {
  if (added.has(rel)) return 'added';
  if (changed.has(rel)) return 'changed';
  return null;
}

async function buildChanges(id, info) {
  const { files } = await loadManifest();
  const rows = [...info.added, ...info.changed].map((rel) => {
    const status = statusOf(rel, info);
    return `<tr><td>${badge(status)}</td><td><code>${escapeHtml(rel)}</code></td><td>${escapeHtml(files[rel]?.about ?? '')}</td></tr>`;
  });
  if (rows.length === 0) return null;
  return (
    `<table class="file-changes"><thead><tr><th></th><th>ファイル</th><th>役割</th></tr></thead><tbody>` +
    rows.join('') +
    `</tbody></table>`
  );
}

function buildFile(rel, info, about) {
  const text = info.current.get(rel);
  const status = statusOf(rel, info);
  const marks = status === 'changed' ? addedLines(info.previous.get(rel), text) : [];
  const meta = [`title="${rel}"`];
  if (marks.length) meta.push(`ins=${ranges(marks)}`);
  const fence = fenceFor(text);
  const hint = status === 'changed' ? '<span class="file-disclosure__hint">色の付いた行が、このレクチャーで足す行です</span>' : '';
  return [
    `<details class="file-disclosure"><summary><code>${escapeHtml(rel)}</code>${badge(status)}<span class="file-disclosure__about">${escapeHtml(about ?? '')}</span></summary>`,
    '',
    hint,
    '',
    `${fence}${langOf(rel)} ${meta.join(' ')}`,
    text.replace(/\n+$/, ''),
    fence,
    '',
    '</details>',
  ].join('\n');
}

/**
 * handson/ 全体のエディタ（`::::editor` コンテナ）。remark-editor.mjs が UI に組み立てる。
 */
export function buildHandsonEditor(info, { zipUrl, title }) {
  const order = (rel) => (info.added.has(rel) ? 0 : info.changed.has(rel) ? 1 : 2);
  // エディタのファイル一覧と同じ並び（フォルダが先、同じフォルダの中は名前順）
  const sortKey = (rel) => rel.split('/').map((seg, i, all) => (i < all.length - 1 ? `0${seg}` : `1${seg}`)).join('/');
  const rels = [...info.current.keys()].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  // 最初に開くのは、このレクチャーで足した（なければ変えた）ファイル。.gitignore などの設定ファイルは後回しにする
  const dot = (rel) => (rel.split('/').pop().startsWith('.') ? 1 : 0);
  const open = rels.filter((rel) => order(rel) < 2).sort((a, b) => order(a) - order(b) || dot(a) - dot(b))[0];
  const out = [`::::editor{title="${title}" tree="true"${zipUrl ? ` zip="${zipUrl}"` : ''}${open ? ` open="${open}"` : ''}}`];
  for (const rel of rels) {
    const text = info.current.get(rel).replace(/\n+$/, '');
    const status = statusOf(rel, info);
    const meta = [`data-file="${rel}"`];
    if (status) meta.push(`data-status="${status}"`);
    if (status === 'changed') {
      const marks = addedLines(info.previous.get(rel), info.current.get(rel));
      if (marks.length) meta.push(`ins=${ranges(marks)}`);
    }
    const fence = fenceFor(text);
    out.push(`${fence}${langOf(rel)} ${meta.join(' ')}`, text, fence);
  }
  out.push('::::');
  return out.join('\n');
}

async function buildTimeline() {
  const { lectures, files } = await loadManifest();
  const rows = [];
  for (const id of lectures) {
    const added = Object.entries(files).filter(([, f]) => f.since === id).map(([rel]) => rel);
    const info = await changesOf(id);
    const changed = [...info.changed];
    const cell = [
      ...added.map((rel) => `${badge('added')}<code>${escapeHtml(rel)}</code>`),
      ...changed.map((rel) => `${badge('changed')}<code>${escapeHtml(rel)}</code>`),
    ].join('<br>');
    rows.push(`<tr><td>${id}</td><td>${cell}</td></tr>`);
  }
  return `<table class="file-changes file-changes--timeline"><thead><tr><th>レクチャー</th><th>足す・変えるファイル</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
}

/**
 * `::changes` / `::file` / `::timeline` を展開する。id はこのレクチャーの ID（レクチャー以外は null）。
 * `::codeview` は sentinels.mjs 側で buildHandsonEditor を呼ぶ。
 */
export async function expandHandsonSentinels(body, { id, where }) {
  if (!/^::(changes|file|timeline)\b/m.test(body)) return body;
  const info = id ? await changesOf(id) : null;
  const { files } = await loadManifest();
  const out = [];
  for (const line of body.split('\n')) {
    if (TIMELINE_RE.test(line)) {
      out.push(await buildTimeline());
      continue;
    }
    if (CHANGES_RE.test(line)) {
      if (!info) {
        console.warn(`[handson] ::changes は handson/ を持つレクチャーでだけ使えます（${where}）`);
        continue;
      }
      const block = await buildChanges(id, info);
      if (block) out.push(block);
      continue;
    }
    const file = line.match(FILE_RE);
    if (file) {
      if (!info) {
        console.warn(`[handson] ::file は handson/ を持つレクチャーでだけ使えます（${where}）`);
        continue;
      }
      const rel = file[1];
      if (!info.current.has(rel)) throw new Error(`[handson] ${where}: ::file{path="${rel}"} は、このレクチャーの ${SNAPSHOT_DIRNAME}/ にありません`);
      out.push(buildFile(rel, info, files[rel]?.about));
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

export { buildSnapshot };
